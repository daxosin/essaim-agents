#!/usr/bin/env node
// avocat.mjs — soumet un objet à UN modèle choisi, via OpenRouter, en mode audit ou contradiction.
// Usage : node avocat.mjs --modele sol --mode audit --fichier plan.md [--fichier ...] [--contexte "..."]
//                         [--sujet nom] [--pro] [--estimer] [--prompt-seul] [--confirme-anonymise] [--force]
// Modèles : sol | deepseek | kimi | fable | opus, ou identifiant OpenRouter complet (ex. x-ai/grok-9).
// Clé : variable d'environnement OPENROUTER_API_KEY (jamais en argument, jamais écrite sur disque).
// Sortie : _avocat/<sujet>/<horodatage>-<modele>-<mode>.md ; journal.jsonl dans le même dossier.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const MODELES = {
  sol:      { id: 'openai/gpt-6.1-sol',            pro: 'openai/gpt-6.1-sol-pro', nom: 'GPT-6.1 Sol' },
  deepseek: { id: 'deepseek/deepseek-v4-pro-0813', nom: 'DeepSeek V4 Pro' },
  kimi:     { id: 'moonshotai/kimi-k3',            nom: 'Kimi K3' },
  fable:    { id: 'anthropic/claude-fable-5.1',    nom: 'Claude Fable 5.1' },
  opus:     { id: 'anthropic/claude-opus-5.5',     nom: 'Claude Opus 5.5' },
};
const MAX_CARACTERES = 400_000;
const DELAI_MS = Number(process.env.AVOCAT_DELAI_MS || 600_000);
// Plafond de dépense mensuel, tous projets confondus (registre global). 0 ou absent = pas de plafond.
const PLAFOND_MOIS_USD = Number(process.env.AVOCAT_PLAFOND_MOIS_USD || 0);
const REGISTRE = process.env.AVOCAT_REGISTRE || path.join(os.homedir(), '.claude', 'avocat-depenses.jsonl');

export const CONSIGNES = {
  audit: `Tu es auditeur indépendant. Tu reçois un livrable et, éventuellement, son contexte et ses critères.
Ta consigne : TROUVER LES ERREURS. Ne complimente pas, ne résume pas le livrable.
Vérifie chaque affirmation vérifiable : chiffres, références (une référence réglementaire non confirmable est un défaut),
comportement du code (cas limites, concurrence, erreurs non gérées, sécurité), cohérence interne.
Si tu n'es pas sûr d'un point, dis-le plutôt que d'affirmer.

Réponds en français, en Markdown, avec EXACTEMENT cette structure :
## Défauts
| Gravité | Localisation | Défaut | Correction attendue |
|---|---|---|---|
(gravité : bloquant = faux, dangereux ou contraire à un critère ; majeur = rend le livrable inutilisable tel quel ; mineur = clarté, forme)
## Angle mort
Ce que le livrable ne traite pas et qu'il devrait traiter (3 points maximum).
## Verdict
Une ligne : VERDICT : accepte (aucun bloquant ni majeur) | a reprendre`,

  contradiction: `Tu es l'avocat du diable. Tu reçois une décision, une thèse ou un plan.
Ta consigne : CONSTRUIRE LE MEILLEUR CAS CONTRE. Tu prends position, tu ne te réfugies pas dans « ça dépend ».
Distingue toujours ce que tu sais de ce que tu supposes.

Réponds en français, en Markdown, avec EXACTEMENT cette structure :
## Objection principale
L'argument le plus fort contre, en un paragraphe.
## Hypothèses fragiles
| Hypothèse implicite | Pourquoi elle peut être fausse | Comment la tester vite |
|---|---|---|
## Pré-mortem
Nous sommes dans un an, c'est un échec. Le scénario le plus probable, en 5 lignes.
## Alternative écartée à tort
L'option que la décision n'a pas sérieusement considérée.
## Ce qui me ferait changer d'avis
Les faits qui rendraient la décision bonne.
## Verdict
Une ligne : VERDICT : maintenir | amender | abandonner — et pourquoi en une phrase.`,
};

// Détection grossière de données personnelles ou de santé. Ce n'est PAS une garantie d'anonymisation.
const SENSIBLES = [
  [/\b[12]\s?\d{2}\s?(0[1-9]|1[0-2])\s?(\d{2}|2[AB])\s?\d{3}\s?\d{3}(\s?\d{2})?\b/, 'numéro de sécurité sociale'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'adresse e-mail'],
  [/(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/, 'numéro de téléphone'],
  [/\b(patients?|patientes?|ordonnance de M|né le|née le|date de naissance)\b/i, 'mention de patient ou d’identité'],
  [/\b(M\.|Mme|Mlle|Monsieur|Madame)\s+[A-ZÀ-Ý][a-zà-ÿ-]+/, 'civilité suivie d’un nom'],
  [/\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(19|20)\d{2}\b/, 'date complète (naissance ?)'],
  [/\bFR\d{2}(\s?[0-9A-Z]{4}){5}/, 'IBAN'],
];

const OPTIONS_BOOLEENNES = ['--pro', '--estimer', '--prompt-seul', '--confirme-anonymise', '--force'];

export function lireArguments(argv) {
  const o = { fichier: [], mode: 'audit' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`valeur manquante après ${k}`);
      i++; return v;
    };
    if (k === '--fichier') o.fichier.push(val());
    else if (k === '--contexte') o.contexte = val();
    else if (k === '--modele') o.modele = val();
    else if (k === '--mode') o.mode = val();
    else if (k === '--sujet') o.sujet = val();
    else if (OPTIONS_BOOLEENNES.includes(k)) o[k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = true;
    else throw new Error(`argument inconnu : ${k}`);
  }
  return o;
}

export function composer({ mode, fichiers, contexte }) {
  if (!CONSIGNES[mode]) throw new Error(`mode inconnu : ${mode} (audit | contradiction)`);
  const blocs = fichiers.map(f => {
    // clôture plus longue que toute suite de « ~ » présente : le contenu ne peut pas fermer le bloc
    const plusLongue = Math.max(3, ...(f.contenu.match(/~+/g) || []).map(x => x.length));
    const cloture = '~'.repeat(plusLongue + 1);
    return `### Fichier : ${f.nom}\n${cloture}\n${f.contenu}\n${cloture}`;
  }).join('\n\n');
  return { systeme: CONSIGNES[mode],
    utilisateur: `${contexte ? `## Contexte et critères\n${contexte}\n\n` : ''}## Objet à examiner\n${blocs}` };
}

export function resoudre(alias, pro) {
  if (!alias) throw new Error(`choisir un modèle : --modele ${Object.keys(MODELES).join(' | ')} (ou identifiant OpenRouter)`);
  if (alias.includes(',')) throw new Error('un seul modèle par appel');
  if (MODELES[alias]) {
    if (pro && !MODELES[alias].pro) console.error(`avertissement : pas de variante « pro » pour ${alias}, modèle standard utilisé`);
    return { alias, id: pro && MODELES[alias].pro ? MODELES[alias].pro : MODELES[alias].id, nom: MODELES[alias].nom };
  }
  if (/^[\w.-]+\/[\w.:-]+$/.test(alias)) return { alias: alias.replace(/[^\w.-]+/g, '_'), id: alias, nom: alias };
  throw new Error(`modèle inconnu : ${alias} (${Object.keys(MODELES).join(', ')}, ou identifiant OpenRouter complet)`);
}

export function detecterSensible(texte) {
  return SENSIBLES.filter(([re]) => re.test(texte)).map(([, nom]) => nom);
}

export function depenseDuMois(registre = REGISTRE, maintenant = new Date()) {
  if (!fs.existsSync(registre)) return 0;
  const mois = maintenant.toISOString().slice(0, 7);
  return fs.readFileSync(registre, 'utf8').split('\n').reduce((s, l) => {
    try { const e = JSON.parse(l); return e.date?.startsWith(mois) ? s + (Number(e.cout_usd) || 0) : s; } catch { return s; }
  }, 0);
}

export const nomSujet = s => (s || 'sans-sujet').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\w.-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '').slice(0, 60) || 'sans-sujet';

async function tarif(id) {
  const r = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`liste des modèles indisponible (${r.status})`);
  const m = (await r.json()).data.find(x => x.id === id);
  if (!m) throw new Error(`modèle introuvable sur OpenRouter : ${id}`);
  return m.pricing;
}

async function interroger(modele, prompt, cle) {
  const debut = Date.now();
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(DELAI_MS),
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', 'X-Title': 'essaim-agents avocat' },
    body: JSON.stringify({
      model: modele.id,
      messages: [{ role: 'system', content: prompt.systeme }, { role: 'user', content: prompt.utilisateur }],
      provider: { data_collection: 'deny' },   // exclut les fournisseurs qui conservent ou entraînent sur les données
      usage: { include: true },
    }),
  });
  const corps = await r.json().catch(() => ({}));
  if (!r.ok || corps.error) throw new Error(`OpenRouter ${r.status} : ${corps.error?.message || r.statusText}`);
  const texte = corps.choices?.[0]?.message?.content;
  if (!texte) throw new Error('réponse vide');
  return { texte, duree_s: Math.round((Date.now() - debut) / 1000),
    cout_usd: corps.usage?.cost ?? null, jetons: corps.usage?.total_tokens ?? null, fournisseur: corps.provider ?? null };
}

async function principal() {
  const o = lireArguments(process.argv.slice(2));
  if (!o.fichier.length && !o.contexte) throw new Error('rien à examiner : --fichier et/ou --contexte');
  // noms relatifs au dossier courant : deux fichiers homonymes restent distincts
  const fichiers = o.fichier.map(f => ({ nom: path.relative(process.cwd(), path.resolve(f)).replace(/\\/g, '/'), contenu: fs.readFileSync(f, 'utf8') }));
  const prompt = composer({ mode: o.mode, fichiers, contexte: o.contexte });
  const taille = prompt.systeme.length + prompt.utilisateur.length;

  const sensibles = detecterSensible(prompt.utilisateur);
  if (sensibles.length && !o.confirmeAnonymise)
    throw new Error(`ARRÊT — données possiblement personnelles détectées (${sensibles.join(', ')}). ` +
      `Anonymiser, ou relancer avec --confirme-anonymise après vérification humaine.`);
  if (taille > MAX_CARACTERES && !o.force)
    throw new Error(`objet trop volumineux (${taille} caractères > ${MAX_CARACTERES}) ; découper, ou --force`);

  const dossier = path.join('_avocat', nomSujet(o.sujet || (o.fichier[0] && path.parse(o.fichier[0]).name)));
  const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '-' + Math.random().toString(36).slice(2, 6);

  if (o.promptSeul) {
    fs.mkdirSync(dossier, { recursive: true });
    const f = path.join(dossier, `${horodatage}-prompt-${o.mode}.md`);
    fs.writeFileSync(f, `# Consigne système\n\n${prompt.systeme}\n\n# Message\n\n${prompt.utilisateur}\n`);
    return console.log(f);
  }

  const modele = resoudre(o.modele, o.pro);
  if (o.estimer) {
    const p = await tarif(modele.id);
    const entree = Math.ceil(taille / 3.5), sortieEst = 3000;
    const c = entree * Number(p.prompt) + sortieEst * Number(p.completion);
    const dm = depenseDuMois();
    return console.log(`${modele.nom} : ~${entree} jetons entrée + ~${sortieEst} sortie ≈ ${c.toFixed(3)} $ (raisonnement non compté)` +
      `\nDépensé ce mois : ${dm.toFixed(3)} $${PLAFOND_MOIS_USD ? ` / plafond ${PLAFOND_MOIS_USD} $` : ''}`);
  }

  const cle = process.env.OPENROUTER_API_KEY;
  if (!cle) throw new Error('OPENROUTER_API_KEY absente de l’environnement');
  if (PLAFOND_MOIS_USD && depenseDuMois() >= PLAFOND_MOIS_USD)
    throw new Error(`PLAFOND MENSUEL atteint (${depenseDuMois().toFixed(3)} $ / ${PLAFOND_MOIS_USD} $) — relever AVOCAT_PLAFOND_MOIS_USD si c'est voulu`);
  const r = await interroger(modele, prompt, cle);

  fs.mkdirSync(dossier, { recursive: true });
  const f = path.join(dossier, `${horodatage}-${modele.alias}-${o.mode}.md`);
  fs.writeFileSync(f, `# ${modele.nom} — ${o.mode}\n\nObjet : ${o.fichier.join(', ') || '(contexte seul)'}\n\n${r.texte}\n`);
  const { texte, ...meta } = r;
  fs.appendFileSync(path.join(dossier, 'journal.jsonl'),
    JSON.stringify({ date: new Date().toISOString(), modele: modele.id, mode: o.mode, fichiers: o.fichier, sortie: path.basename(f), ...meta }) + '\n');
  fs.mkdirSync(path.dirname(REGISTRE), { recursive: true });
  fs.appendFileSync(REGISTRE, JSON.stringify({ date: new Date().toISOString(), modele: modele.id, mode: o.mode, sujet: path.basename(dossier), cout_usd: r.cout_usd }) + '\n');
  console.log(`${f}  ·  ${r.duree_s} s  ·  ${r.cout_usd != null ? r.cout_usd.toFixed(3) + ' $' : 'coût n/c'}`);
}

const estPrincipal = () => {
  try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url)); } catch { return false; }
};
if (process.argv[1] && estPrincipal()) principal().catch(e => { console.error(e.message); process.exit(1); });
