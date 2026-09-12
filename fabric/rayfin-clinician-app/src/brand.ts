/**
 * The organisation this app is branded for.
 *
 * **Marrowfield Orthopaedic Centre is invented for this demonstration.** It is
 * not a real trust, hospital or health system, does not correspond to one, and
 * is not modelled on one. The previous build wore the NHS design system, which
 * made a teaching prototype look like an official service — a worse problem than
 * looking unfinished, because a clinician who mistakes provenance mistakes
 * accountability with it.
 *
 * What is real and stays real: the Oxford Knee Score, the EQ-5D-3L, the 7-point
 * MCID, and NHS PROMs as the data source of the underlying model. Those are
 * cited accurately. Only the trust around them is fictional.
 */
export const BRAND = {
  org: 'Marrowfield Orthopaedic Centre',
  orgShort: 'Marrowfield',
  /** Rendered next to the name everywhere it appears. Not a footnote. */
  orgQualifier: 'Fictional trust · demonstration system',
  product: 'Knee Outcome Review',
  productSubtitle: 'Pre-operative decision support · knee replacement',
  /** The one-line safety statement. Shown on the sign-in page and the patient page. */
  disclaimer:
    'Decision support only. This tool informs a conversation between clinician and patient. It does not authorise, refuse, prioritise or schedule surgery, and must not be the sole basis for a clinical decision.',
} as const;
