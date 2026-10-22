#!/usr/bin/env node
// journal.mjs — journal des missions d'essaim, pour recalibrer la matrice de qualification sur des faits.
// Registre global : ESSAIM_JOURNAL, sinon ~/.claude/essaim-journal.jsonl (une ligne JSON par mission).
// Usage :
//   node journal.mjs ajouter --mission audit-secu --architecture stigmergique --surcouche boucle
//        --qualif "A=emergente B=independantes C=>15 H=homogenes P=plusieurs D=critique"
//        --agents 12 --vagues 3 --cout 1.8 --duree-min 40 --taches 23 --rejets 4 --releves 2
//        --verdict utile|partiel|inutile --note "..."
//   node journal.mjs stats
//   node journal.mjs lister [n]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const ARCHITECTURES = ['solo', 'routeur', 'chaine', 'fanout', 'orchestrateur', 'stigmergique'];
export const SURCOUCHES = ['aucune', 'vote', 'boucle', 'debat'];
export const VERDICTS = ['utile', 'partiel', 'inutile'];
const NUMERIQUES = ['agents', 'vagues', 'cout', 'duree-min', 'taches', 'rejets', 'releves'];
const registre = () => process.env.ESSAIM_JOURNAL || path.join(os.homedir(), '.claude', 'essaim-journal.jsonl');

export function lireArguments(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i], v = argv[i + 1];
    if (!k?.startsWith('--') || v === undefined || v.startsWith('--')) throw new Error(`argument mal formé près de ${k}`);
    o[k.slice(2)] = v;
  }
  return o;
}

export function valider(o) {
  const erreurs = [];
  if (!o.mission) erreurs.push('--mission requis');
  if (!ARCHITECTURES.includes(o.architecture)) erreurs.push(`--architecture : ${ARCHITECTURES.join(' | ')}`);
  if (!SURCOUCHES.includes(o.surcouche || 'aucune')) erreurs.push(`--surcouche : ${SURCOUCHES.join(' | ')}`);
  if (!VERDICTS.includes(o.verdict)) erreurs.push(`--verdict (jugement d'Emmanuel) : ${VERDICTS.join(' | ')}`);
  for (const k of NUMERIQUES) if (o[k] !== undefined && !(Number(o[k]) >= 0)) erreurs.push(`--${k} : nombre ≥ 0`);
  if (erreurs.length) throw new Error(erreurs.join('\n'));
  const e = { date: new Date().toISOString(), mission: o.mission, architecture: o.architecture,
    surcouche: o.surcouche || 'aucune', qualif: o.qualif || null, verdict: o.verdict, note: o.note || '' };
  for (const k of NUMERIQUES) e[k.replace('-', '_')] = o[k] === undefined ? null : Number(o[k]);
  return e;
}

export function lire(f = registre()) {
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
}

const moyenne = xs => { const v = xs.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

export function statistiques(entrees) {
  const groupes = {};
  for (const e of entrees) (groupes[`${e.architecture}+${e.surcouche}`] ||= []).push(e);
  return Object.entries(groupes).map(([cle, es]) => {
    const n = es.length;
    const part = v => es.filter(e => e.verdict === v).length / n;
    const rejets = moyenne(es.map(e => (e.taches ? (e.rejets ?? 0) / e.taches : null)));
    const alerte = n >= 5 && part('utile') < 0.5 ? 'moins d’une mission sur deux jugée utile : revoir la règle qui mène à ce choix'
      : n >= 5 && rejets != null && rejets > 0.3 ? 'plus de 30 % de tâches rejetées : fourrageurs trop légers ou consignes floues'
      : n < 5 ? `échantillon trop petit (${n}/5) pour conclure` : null;
    return { combinaison: cle, missions: n, utile: part('utile'), partiel: part('partiel'), inutile: part('inutile'),
      cout_moyen: moyenne(es.map(e => e.cout)), duree_moyenne: moyenne(es.map(e => e.duree_min)),
      taux_rejet: rejets, releves_moyennes: moyenne(es.map(e => e.releves)), alerte };
  }).sort((a, b) => b.missions - a.missions);
}

function principal() {
  const [cmd, ...reste] = process.argv.slice(2);
  const pct = x => (x == null ? '—' : `${Math.round(x * 100)} %`);
  const nb = (x, d = 1) => (x == null ? '—' : x.toFixed(d));
  if (cmd === 'ajouter') {
    const e = valider(lireArguments(reste));
    fs.mkdirSync(path.dirname(registre()), { recursive: true });
    fs.appendFileSync(registre(), JSON.stringify(e) + '\n');
    console.log(`mission « ${e.mission} » consignée (${e.architecture} + ${e.surcouche}, ${e.verdict})`);
  } else if (cmd === 'stats') {
    const s = statistiques(lire());
    if (!s.length) return console.log('journal vide');
    console.log('combinaison                 n  utile partiel inutile  coût moy.  durée moy.  rejets  relèves');
    for (const l of s) {
      console.log(`${l.combinaison.padEnd(26)} ${String(l.missions).padStart(2)}  ${pct(l.utile).padStart(5)} ${pct(l.partiel).padStart(7)} ${pct(l.inutile).padStart(7)}  ${(nb(l.cout_moyen, 2) + ' $').padStart(9)}  ${(nb(l.duree_moyenne, 0) + ' min').padStart(10)}  ${pct(l.taux_rejet).padStart(6)}  ${nb(l.releves_moyennes).padStart(7)}`);
      if (l.alerte) console.log(`  ↳ ${l.alerte}`);
    }
  } else if (cmd === 'lister') {
    const n = Number(reste[0] || 10);
    for (const e of lire().slice(-n))
      console.log(`${e.date.slice(0, 10)}  ${e.mission.padEnd(24)} ${(e.architecture + '+' + e.surcouche).padEnd(24)} ${e.verdict.padEnd(8)} ${e.note}`);
  } else {
    console.log('Usage : node journal.mjs ajouter --mission ... --architecture ... --verdict ... | stats | lister [n]');
    process.exitCode = cmd ? 1 : 0;
  }
}

const estPrincipal = () => {
  try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url)); } catch { return false; }
};
if (process.argv[1] && estPrincipal()) {
  try { principal(); } catch (e) { console.error(e.message); process.exit(1); }
}
