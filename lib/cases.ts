export type CaseField =
  | 'demographics'
  | 'anamnesis'
  | 'clinical'
  | 'labs'
  | 'ctReport';

/** Structured case input, mirroring the protocol §3.3 "must-have" variables. */
export interface CaseFields {
  /** age, sex */
  demographics: string;
  /** clinical context / presentation + anticoagulant use */
  anamnesis: string;
  /** vital signs: SBP, HR (shock index) */
  clinical: string;
  /** laboratory values: Hb, INR, platelets, lactate */
  labs: string;
  /** CT-report finding (the active extravasation / blush) */
  ctReport: string;
}

export interface PresetCase extends CaseFields {
  id: string;
  title: string;
}

export const CASE_FIELD_ORDER: CaseField[] = [
  'demographics',
  'anamnesis',
  'clinical',
  'labs',
  'ctReport',
];

/** Heading used when folding each field into the single prompt sent to models. */
export const CASE_FIELD_PROMPT_LABELS: Record<CaseField, string> = {
  demographics: 'Patient',
  anamnesis: 'Clinical context',
  clinical: 'Vital signs',
  labs: 'Laboratory values',
  ctReport: 'CT report',
};

const EMPTY_CASE_FIELDS: CaseFields = {
  demographics: '',
  anamnesis: '',
  clinical: '',
  labs: '',
  ctReport: '',
};

export function presetToCaseFields(preset: PresetCase): CaseFields {
  return {
    demographics: preset.demographics,
    anamnesis: preset.anamnesis,
    clinical: preset.clinical,
    labs: preset.labs,
    ctReport: preset.ctReport,
  };
}

export function emptyCaseFields(): CaseFields {
  return { ...EMPTY_CASE_FIELDS };
}

/** Fold the structured fields into one labeled case string (omitting empties). */
export function assembleCaseText(fields: CaseFields): string {
  return CASE_FIELD_ORDER.map((key) => {
    const value = fields[key].trim();
    return value ? `${CASE_FIELD_PROMPT_LABELS[key]}: ${value}` : null;
  })
    .filter((line): line is string => line !== null)
    .join('\n');
}

export const PRESET_CASES: PresetCase[] = [
  {
    id: 'post-polypectomy-bleed',
    title: 'Post-polypectomy colonic bleed',
    demographics: '72-year-old man',
    anamnesis:
      'Brisk hematochezia six hours after uncomplicated cecal polypectomy during screening colonoscopy. Pale and diaphoretic. Takes aspirin for coronary artery disease. IR and surgery available on site.',
    clinical: 'BP 95/60 mmHg, HR 112 (shock index ~1.18).',
    labs: 'Hb 7.4 g/dL, fallen from 9.1 despite crystalloid resuscitation.',
    ctReport:
      'CTA: active arterial extravasation from a branch of the ileocolic artery at the prior polypectomy site.',
  },
  {
    id: 'pelvic-trauma',
    title: 'Pelvic trauma',
    demographics: '34-year-old woman',
    anamnesis:
      'Struck by a motorcycle; unstable Tile C pelvic ring fracture. Intubated and on vasopressors. Received two units of packed red cells. FAST negative for intraperitoneal free fluid. Trauma surgery and IR mobilized and available.',
    clinical: 'Hypotensive at 80/55 mmHg with tachycardia.',
    labs: 'Coagulopathic; lactate 4.2 mmol/L.',
    ctReport:
      'CT angiography: focal arterial blush adjacent to the left internal iliac branch territory, concerning for pelvic arterial hemorrhage.',
  },
  {
    id: 'postpartum-hemorrhage',
    title: 'Postpartum hemorrhage',
    demographics: '29-year-old woman',
    anamnesis:
      'Persistent postpartum hemorrhage three hours after spontaneous vaginal delivery of twins. Uterine atony unresponsive to oxytocin, carboprost, misoprostol, and a Bakri balloon. Estimated blood loss 2.1 L. Borderline hemodynamics for IR transfer; IR and obstetric surgery available.',
    clinical: 'Tachycardic, maintaining MAP 65 mmHg on limited fluids.',
    labs: 'Fibrinogen 1.6 g/L.',
    ctReport:
      'Ultrasound: enlarged, boggy uterus without retained products.',
  },
  {
    id: 'hemoptysis',
    title: 'Hemoptysis',
    demographics: '58-year-old man',
    anamnesis:
      'Advanced cystic fibrosis. 350 mL of hemoptysis over 24 hours, his largest bleed to date. Prior bronchoalveolar lavage cultures grew Pseudomonas. Not a surgical candidate.',
    clinical: 'Hemodynamically stable, on supplemental oxygen.',
    labs: 'Hb 10.8 g/dL.',
    ctReport:
      'CTA chest: markedly hypertrophied right bronchial artery supplying the right lower lobe, without active contrast extravasation.',
  },
  {
    id: 'post-ercp-hemorrhage',
    title: 'Post-ERCP hemorrhage',
    demographics: '66-year-old woman',
    anamnesis:
      'On apixaban (held 18 hours). Melena and symptomatic hypotension twelve hours after biliary sphincterotomy during ERCP for choledocholithiasis. Upper endoscopy could not identify or control a bleeding source in the duodenal papilla region. Received four units PRBC with transient response.',
    clinical: 'Symptomatic hypotension.',
    labs: 'Hb 7.2 g/dL, dropped 3 g/dL from baseline.',
    ctReport: 'CTA: no active extravasation; duodenal wall hematoma.',
  },
];
