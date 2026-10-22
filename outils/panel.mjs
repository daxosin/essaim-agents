#!/usr/bin/env node
// panel.mjs — soumet un même objet à plusieurs modèles via OpenRouter, en aveugle et en parallèle.
// Modes : audit (trouver les erreurs d'un livrable) | contradiction (avocat du diable d'une décision).
// Usage : node panel.mjs --mode audit --fichier plan.md [--fichier ...] [--contexte "..."]
//                        [--modeles sol,deepseek,kimi,fable,opus] [--sortie dossier] [--pro]
//                        [--estimer] [--prompt-seul] [--confirme-anonymise] [--force]
// Clé : variable d'environnement OPENROUTER_API_KEY (jamais en argument, jamais écrite sur disque).
import fs from 'node:fs';
import path from 'node:path';

export const MODELES = {
  sol:      { id: 'openai/gpt-6.1-sol',             pro: 'openai/gpt-6.1-sol-pro', nom: 'GPT-6.1 Sol' },
  deepseek: { id: 'deepseek/deepseek-v4-pro-0813',  nom: 'DeepSeek V4 Pro' },
  kimi:     { id: 'moonshotai/kimi-k3',             nom: 'Kimi K3' },
  fable:    { id: 'anthropic/claude-fable-5.1',     nom: 'Claude Fable 5.1' },
  opus:     { id: 'anthropic/claude-opus-5.5',      nom: 'Claude Opus 5.5' },
};
const DEFAUT = 'sol,deepseek,kimi,fable,opus';
const MAX_CARACTERES = 400_000;
const DELAI_MS = Number(process.env.PANEL_DELAI_MS || 600_000);

export const CONSIGNES = {
  audit: `Tu es auditeur indépendant. Tu reçois un livrable et, éventuellement, son contexte et ses critères.
D'autres auditeurs examinent le même livrable sans te voir : ta valeur est ce que toi seul remarques.
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
D'autres contradicteurs l'examinent sans te voir : ta valeur est l'objection que les autres n'auront pas.
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
  [/\b0[1-9](?:[\s.-]?\d{2}){4}\b/, 'numéro de téléphone'],
  [/\b(patient|patiente|ordonnance de M|né le|née le|date de naissance)\b/i, 'mention de patient ou d’identité'],
];

function args(argv) {
  const o = { fichier: [], modeles: DEFAUT, mode: 'audit', sortie: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`valeur manquante après ${k}`); return argv[++i]; };
    if (k === '--fichier') o.fichier.push(val());
    else if (k === '--contexte') o.contexte = val();
    else if (k === '--modeles') o.modeles = val();
    else if (k === '--mode') o.mode = val();
    else if (k === '--sortie') o.sortie = val();
    else if (['--pro', '--estimer', '--prompt-seul', '--confirme-anonymise', '--force'].includes(k))
      o[k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = true;
    else throw new Error(`argument inconnu : ${k}`);
  }
  return o;
}

export function composer({ mode, fichiers, contexte }) {
  if (!CONSIGNES[mode]) throw new Error(`mode inconnu : ${mode} (audit | contradiction)`);
  const blocs = fichiers.map(f => `### Fichier : ${f.nom}\n\`\`\`\n${f.contenu}\n\`\`\``).join('\n\n');
  return { systeme: CONSIGNES[mode],
    utilisateur: `${contexte ? `## Contexte et critères\n${contexte}\n\n` : ''}## Objet à examiner\n${blocs}` };
}

export function resoudre(liste, pro) {
  return liste.split(',').map(s => s.trim()).filter(Boolean).map(alias => {
    if (MODELES[alias]) return { alias, id: pro && MODELES[alias].pro ? MODELES[alias].pro : MODELES[alias].id, nom: MODELES[alias].nom };
    if (alias.includes('/')) return { alias: alias.replace(/[^\w.-]+/g, '_'), id: alias, nom: alias };
    throw new Error(`modèle inconnu : ${alias} (alias : ${Object.keys(MODELES).join(', ')}, ou identifiant OpenRouter complet)`);
  });
}

export function detecterSensible(texte) {
  return SENSIBLES.filter(([re]) => re.test(texte)).map(([, nom]) => nom);
}

async function tarifs() {
  const r = await fetch('https://openrouter.ai/api/v1/models');
  if (!r.ok) throw new Error(`liste des modèles indisponible (${r.status})`);
  return Object.fromEntries((await r.json()).data.map(m => [m.id, m.pricing]));
}

async function interroger(modele, prompt, cle) {
  const debut = Date.now();
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(DELAI_MS),
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json',
      'X-Title': 'essaim-agents panel' },
    body: JSON.stringify({
      model: modele.id,
      messages: [{ role: 'system', content: prompt.systeme }, { role: 'user', content: prompt.utilisateur }],
      provider: { data_collection: 'deny' },   // exclut les fournisseurs qui conservent ou entraînent sur les données
      usage: { include: true },
    }),
  });
  const corps = await r.json().catch(() => ({}));
  if (!r.ok || corps.error) throw new Error(`${r.status} ${corps.error?.message || r.statusText}`);
  const texte = corps.choices?.[0]?.message?.content;
  if (!texte) throw new Error('réponse vide');
  return { texte, duree_s: Math.round((Date.now() - debut) / 1000),
    cout_usd: corps.usage?.cost ?? null, jetons: corps.usage?.total_tokens ?? null, fournisseur: corps.provider ?? null };
}

async function principal() {
  const o = args(process.argv.slice(2));
  if (!o.fichier.length && !o.contexte) throw new Error('rien à examiner : --fichier et/ou --contexte');
  const fichiers = o.fichier.map(f => ({ nom: f, contenu: fs.readFileSync(f, 'utf8') }));
  const prompt = composer({ mode: o.mode, fichiers, contexte: o.contexte });
  const tout = prompt.systeme + prompt.utilisateur;

  const sensibles = detecterSensible(prompt.utilisateur);
  if (sensibles.length && !o.confirmeAnonymise)
    throw new Error(`ARRÊT — données possiblement personnelles détectées (${sensibles.join(', ')}). ` +
      `Anonymiser, ou relancer avec --confirme-anonymise après vérification humaine.`);
  if (tout.length > MAX_CARACTERES && !o.force)
    throw new Error(`objet trop volumineux (${tout.length} caractères > ${MAX_CARACTERES}) ; découper, ou --force`);

  const sortie = o.sortie || path.join('_panel', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '-' + o.mode);
  if (o.promptSeul) {
    fs.mkdirSync(sortie, { recursive: true });
    fs.writeFileSync(path.join(sortie, 'prompt.md'), `# Consigne système\n\n${prompt.systeme}\n\n# Message\n\n${prompt.utilisateur}\n`);
    return console.log(path.join(sortie, 'prompt.md'));
  }

  const modeles = resoudre(o.modeles, o.pro);
  if (o.estimer) {
    const prix = await tarifs();
    const entree = Math.ceil(tout.length / 3.5), sortieEst = 3000;
    let total = 0;
    for (const m of modeles) {
      const p = prix[m.id];
      if (!p) { console.log(`${m.nom.padEnd(18)} introuvable sur OpenRouter (${m.id})`); continue; }
      const c = entree * Number(p.prompt) + sortieEst * Number(p.completion);
      total += c;
      console.log(`${m.nom.padEnd(18)} ~${entree} jetons entrée + ~${sortieEst} sortie ≈ ${c.toFixed(3)} $`);
    }
    return console.log(`Total estimé ≈ ${total.toFixed(3)} $ (estimation grossière, raisonnement non compté)`);
  }

  const cle = process.env.OPENROUTER_API_KEY;
  if (!cle) throw new Error('OPENROUTER_API_KEY absente de l’environnement');
  fs.mkdirSync(sortie, { recursive: true });

  const resultats = await Promise.allSettled(modeles.map(m => interroger(m, prompt, cle)));
  const bilan = modeles.map((m, i) => {
    const r = resultats[i];
    if (r.status === 'fulfilled') {
      fs.writeFileSync(path.join(sortie, `${m.alias}.md`), `# ${m.nom} — ${o.mode}\n\n${r.value.texte}\n`);
      const { texte, ...meta } = r.value;
      return { alias: m.alias, modele: m.id, ok: true, ...meta };
    }
    return { alias: m.alias, modele: m.id, ok: false, erreur: String(r.reason?.message || r.reason) };
  });
  fs.writeFileSync(path.join(sortie, 'bilan.json'), JSON.stringify({ mode: o.mode, fichiers: o.fichier, date: new Date().toISOString(), bilan }, null, 2));

  for (const b of bilan)
    console.log(b.ok ? `✓ ${b.alias.padEnd(9)} ${String(b.duree_s).padStart(4)} s  ${b.cout_usd != null ? b.cout_usd.toFixed(3) + ' $' : 'coût n/c'}`
                     : `✗ ${b.alias.padEnd(9)} ${b.erreur}`);
  const cout = bilan.reduce((s, b) => s + (b.cout_usd || 0), 0);
  console.log(`Sortie : ${sortie}  ·  coût total ${cout.toFixed(3)} $`);
  if (bilan.every(b => !b.ok)) process.exitCode = 3;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('panel.mjs'))
  principal().catch(e => { console.error(e.message); process.exit(1); });
