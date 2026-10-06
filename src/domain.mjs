import {
  str,
  obj,
  arrays,
  rows,
  integer,
  finite,
  safe,
  money,
  sum,
  boolean,
  one,
  refs,
  semantic,
  check,
  date,
  addYears,
} from "./helpers.mjs";
export const LIMIT =
  "La chaîne documentaire ne décide ni de la responsabilité du locataire, ni de la vétusté, ni de la légalité de la retenue.";
export function validateInput(x) {}
export function prepare(x) {
  const checks = [],
    pairs = [],
    matrix = [];
  money(x.depositCents);
  money(x.retainedCents);
  obj(x.entry);
  obj(x.exit);
  date(x.entry.date);
  date(x.exit.date);
  rows(x.entry.items);
  rows(x.exit.items);
  rows(x.deductions);
  checks.push(
    check(
      "chronologie",
      "Ordre des états des lieux",
      x.entry.date <= x.exit.date,
      refs(x.entry, x.exit),
    ),
    check(
      "total",
      "Somme des retenues",
      sum(x.deductions.map((d) => money(d.amountCents))) === x.retainedCents,
      refs(...x.deductions),
    ),
    check(
      "plafond",
      "Retenues dans la caution fournie",
      x.retainedCents <= x.depositCents,
      refs(...x.deductions),
    ),
  );
  for (const d of x.deductions) {
    obj(d);
    str(d.itemId);
    str(d.description);
    const a = x.entry.items.find((i) => i.id === d.itemId),
      b = x.exit.items.find((i) => i.id === d.itemId);
    const r = refs(x.entry, x.exit, d, ...(d.proof ? [obj(d.proof)] : []));
    checks.push(
      check(
        d.id + "-piece",
        "Justificatif de montant : " + d.id,
        d.proof ? money(d.proof.amountCents) >= d.amountCents : null,
        r,
        "Obtenir le devis ou la facture et expliquer toute répartition.",
      ),
    );
    checks.push(
      check(
        d.id + "-objet",
        "Même élément dans les deux états des lieux",
        a && b ? a.room === b.room : null,
        r,
      ),
    );
    pairs.push(
      semantic(
        d.id + "-etat",
        "Évolution documentée",
        a?.description,
        b?.description,
        r,
        "Le passage de sortie établit-il une dégradation nouvelle par rapport à l’entrée ? Un défaut déjà présent contredit cette conclusion. Ne déduisez pas la responsabilité ni la vétusté.",
        true,
      ),
    );
    pairs.push(
      semantic(
        d.id + "-travaux",
        "Justificatif lié à la retenue",
        d.description,
        d.proof?.description,
        r,
        "Le justificatif décrit-il précisément la réparation ou dépense retenue, sur le même élément ?",
      ),
    );
    matrix.push({
      retenue: d.id,
      element: d.itemId,
      montantCentimes: d.amountCents,
      justificatif: d.proof?.docId ?? null,
    });
  }
  return {
    checks,
    pairs,
    outputs: {
      matrix,
      totalRetenuCentimes: x.retainedCents,
      restitutionTheoriqueCentimes: Math.max(
        0,
        x.depositCents - x.retainedCents,
      ),
    },
  };
}
