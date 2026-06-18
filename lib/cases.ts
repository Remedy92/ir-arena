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

/**
 * Citation for a vignette adapted from a real published case report.
 * Reference/display metadata only — never folded into the prompt sent to models
 * (see `presetToCaseFields` / `assembleCaseText`, which touch only the clinical fields).
 */
export interface CaseSource {
  /** Short citation: authors. Title. Journal. Year. */
  citation: string;
  /** Canonical PubMed URL. */
  url: string;
  /** PubMed ID. */
  pmid: string;
  /** DOI, when available. */
  doi?: string;
}

export type CaseTier = 'starter' | 'tough';

/**
 * Display-only metadata that powers the case picker (grouping, tag, one-line hook).
 * Never folded into the prompt sent to models — purely a clinician-facing aid.
 */
export interface CaseDisplay {
  /** Clinical domain, used to group and color-tag the case in the picker. */
  category: string;
  /** 'starter' = clear-cut teaching case; 'tough' = built to split the models. */
  tier: CaseTier;
  /** One-line hook shown under the title (usually the management fork). */
  teaser: string;
}

export interface PresetCase extends CaseFields {
  id: string;
  title: string;
  /**
   * Optional source for vignettes adapted from a real published case report.
   * Such vignettes are synthetic, de-identified adaptations: facts central to the
   * management ambiguity are kept faithful to the source, while clinical values the
   * article did not report are clinically-consistent synthesis chosen to preserve
   * that ambiguity. Never sent to models.
   */
  source?: CaseSource;
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
  {
    id: 'blunt-splenic-grade-iii-no-blush',
    title: 'Blunt splenic injury, transient shock, no blush',
    demographics: '44-year-old man',
    anamnesis:
      'High-speed single-vehicle collision; transiently hypotensive at the referring hospital (BP nadir 78/42 mmHg) and transferred 5 hours after injury, receiving 6 units packed red cells and 4 units fresh frozen plasma en route. Hemodynamics restored on arrival and stable since. Associated sternal and rib fractures. Healthy, on no anticoagulant or antiplatelet agent. Trauma surgery and IR both available on site.',
    clinical:
      'On arrival BP 110/51 mmHg, HR 86 (shock index ~0.78); had been hypotensive pre-transfer.',
    labs:
      'Hb 10.7 g/dL, INR 1.03, aPTT 22.2 s, platelets 176 x10^9/L, fibrinogen 212 mg/dL, lactate 1.8 mmol/L.',
    ctReport:
      'CTA abdomen: AAST grade III splenic laceration with moderate-to-large hemoperitoneum. No active contrast extravasation, no pseudoaneurysm, and no arteriovenous fistula identified. Devascularized splenic parenchyma estimated to approach 25%.',
    source: {
      citation:
        'Imamoto et al. A Case of Traumatic Splenic Arteriovenous Fistula Treated by Transcatheter Arterial Embolization. Cureus. 2024.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/39109143/',
      pmid: '39109143',
      doi: '10.7759/cureus.63986',
    },
  },
  {
    id: 'blunt-hepatic-portal-vein-injury',
    title: 'Blunt hepatic trauma with portal venous bleed',
    demographics: '29-year-old woman',
    anamnesis:
      'High-speed passenger-car collision; isolated blunt abdominal trauma with no other organ injury identified on the trauma survey. No medical history, no anticoagulant or antiplatelet use. Level I trauma center with an experienced hepatobiliary interventional radiologist and hepatobiliary/trauma surgery on site; surgical team on standby for damage-control laparotomy.',
    clinical:
      'BP 115/81 mmHg, HR 112 (shock index ~0.97); borderline but stable on initial resuscitation, no vasopressors.',
    labs:
      'Hb 14.3 g/dL, platelets 190 x10^9/L, INR 1.1, fibrinogen 2.4 g/L, lactate 2.0 mmol/L. AST/ALT markedly elevated at 599/550 U/L.',
    ctReport:
      'CT: grade IV liver laceration with capsular disruption and massive hemoperitoneum. Active contrast extravasation appears to arise from a branch of the right portal vein rather than the hepatic artery. No other intra-abdominal organ injury identified.',
    source: {
      citation:
        'Cho et al. Portal vein embolization in intrahepatic portal vein injury after blunt trauma: a case report. Journal of Trauma and Injury. 2022.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/39381165/',
      pmid: '39381165',
      doi: '10.20408/jti.2022.0013',
    },
  },
  {
    id: 'ruptured-renal-aml-wunderlich',
    title: 'Ruptured renal angiomyolipoma (Wunderlich syndrome)',
    demographics: '60-year-old woman',
    anamnesis:
      'Right flank pain for five days, acutely worse over the last 24 hours; no trauma and no gross hematuria. No significant past medical history and not on any anticoagulant or antiplatelet agent. Incidental acute pulmonary embolism noted on imaging, not yet anticoagulated. IR and surgery (urology/general surgery) available on site.',
    clinical:
      'BP 124/78 mmHg, HR 92 (shock index ~0.74); hemodynamically stable, no vasopressors.',
    labs:
      'Hb 6.7 g/dL (microcytic) rising to 8.5 g/dL after 2 units PRBC, platelets 518 x10^9/L, WBC 12 x10^9/L, INR 0.99, PT/aPTT normal, creatinine 0.9 mg/dL.',
    ctReport:
      'CTA: 12 x 14 cm right perirenal hematoma with mass effect on the kidney; heterogeneous fat-containing inferior-pole mass consistent with angiomyolipoma, containing multiple giant intralesional aneurysms and pseudoaneurysms; active arterial extravasation from a lower-pole renal artery branch. Incidental acute pulmonary embolism.',
    source: {
      citation:
        'Alataa et al. Page Kidney Following Ruptured Renal Angiomyolipoma Managed With Selective Embolization: A Case Report. Cureus. 2026.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/42306404/',
      pmid: '42306404',
      doi: '10.7759/cureus.108976',
    },
  },
  {
    id: 'delayed-traumatic-ileal-rebleed',
    title: 'Delayed post-traumatic ileal rebleed, CTA-negative',
    demographics: '84-year-old man',
    anamnesis:
      'Blunt abdominal trauma after a fall down a flight of stairs, managed nonoperatively. Background hypertension only; on no anticoagulant or antiplatelet therapy. Earlier in the admission a massive lower-GI bleed was localized to a superior mesenteric artery branch on CTA and controlled with super-selective coil embolization, after roughly 16 units of packed red cells across the stay. Now, about ten days later, recurrent hematochezia with a fresh hemoglobin drop. IR and surgery available on site.',
    clinical:
      'BP 104/64 mmHg, HR 96 (shock index ~0.92) after transfusion; transiently hypotensive at the onset of the bleed, now stabilizing.',
    labs:
      'Hb 6.4 g/dL, down from 7.9; INR 1.1, platelets 198 x10^9/L, fibrinogen 318 mg/dL, lactate 2.0 mmol/L, creatinine 1.8 mg/dL.',
    ctReport:
      'CTA abdomen/pelvis: no active contrast extravasation. Residual segmental ileal wall thickening with prior super-selective coils in an SMA branch; no pseudoaneurysm and no stricture.',
    source: {
      citation:
        'Asada et al. Delayed Ileal Hemorrhage After Blunt Abdominal Trauma Successfully Managed With Capsule Endoscopy: A Case Report. Cureus. 2025.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/41146770/',
      pmid: '41146770',
      doi: '10.7759/cureus.93276',
    },
  },
  {
    id: 'ruptured-ipda-celiac-occlusion',
    title: 'Ruptured pancreaticoduodenal aneurysm with celiac occlusion',
    demographics: '39-year-old man',
    anamnesis:
      'One day of nausea, vomiting, anorexia, and a syncopal episode, with diffuse abdominal pain now worse on movement. No known prior pancreatitis, no anticoagulant or antiplatelet use, and no bleeding diathesis. Presented to the emergency department; interventional radiology and general/vascular surgery are both available, but the angiography suite is in a separate location from the operating theatre (no intraoperative fluoroscopy in the OR).',
    clinical:
      'BP 102/71 mmHg, HR 120 (shock index ~1.18). Voluntary abdominal guarding; bilateral lower-quadrant purpura.',
    labs:
      'Hb 9.3 g/dL, hematocrit 25.7%, platelets 143 x10^9/L, INR 1.1, fibrinogen 2.6 g/L, lactate 2.2 mmol/L.',
    ctReport:
      'CT angiogram of the abdomen and pelvis: a retropancreatic (retroperitoneal) hematoma at the base of the transverse mesocolon with free intraperitoneal fluid layering above the liver. No active contrast extravasation is identified. The celiac axis origin is occluded, with the pancreaticoduodenal arcade and gastroduodenal artery reconstituting the hepatic and splenic arteries in a retrograde fashion (hypertrophied arch of Buhler). A small visceral artery aneurysm is suspected in the proximal superior mesenteric / pancreaticoduodenal territory, but the bleeding source is not definitively localized. The hematoma appears stable and non-expanding.',
    source: {
      citation:
        'Kibrik et al. Endovascular repair and management of a ruptured inferior pancreaticoduodenal artery aneurysm: A case report and literature review. Journal of Vascular Surgery Cases and Innovative Techniques. 2024.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/39649732/',
      pmid: '39649732',
      doi: '10.1016/j.jvscit.2024.101650',
    },
  },
  {
    id: 'pancreatitis-pseudoaneurysm-anticoag',
    title: 'Pancreatitis pseudoaneurysm bleed on anticoagulation',
    demographics: '13-year-old boy',
    anamnesis:
      'Tacrolimus-associated necrotizing pancreatitis (background intractable ulcerative colitis) with walled-off necrosis already drained endoscopically. Multifocal pancreaticoduodenal-arcade pseudoaneurysms have bled twice and were coil-embolized at two prior sessions. A catheter-related right atrial thrombus with pulmonary embolism mandates anticoagulation; on therapeutic unfractionated heparin he now develops sudden severe abdominal pain, hematemesis, and massive hematochezia. Pediatric IR, interventional endoscopy, and hepatobiliary surgery available on site.',
    clinical:
      'BP 66 mmHg systolic, HR 148 (shock index ~2.2); cool peripheries, transiently responsive to fluid resuscitation.',
    labs:
      'Hb 6.3 g/dL (down from 9.5), platelets 132 x10^9/L, fibrinogen 1.9 g/L, aPTT supratherapeutic on heparin, lactate 4.6 mmol/L.',
    ctReport:
      'Emergent CTA: a newly enlarged pseudoaneurysm arising from the anterior-inferior pancreaticoduodenal artery branch with active contrast extravasation into the duodenum, within the inflamed peripancreatic necrotic field. Coils from prior embolizations are seen at the gastroduodenal and posterior-superior pancreaticoduodenal territories, with collateral arcade filling.',
    source: {
      citation:
        'Wada et al. Adolescent Acute Pancreatitis Complicated With Pseudoaneurysms and Venous Thrombosis. Cureus. 2023.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/36733570/',
      pmid: '36733570',
      doi: '10.7759/cureus.33228',
    },
  },
  {
    id: 'anticoagulant-iliopsoas-hematoma',
    title: 'Spontaneous iliopsoas hematoma on anticoagulation',
    demographics: '79-year-old man',
    anamnesis:
      'Admitted a week ago for worsening dyspnea and treated for lobar pneumonia with intravenous antibiotics. Background persistent atrial fibrillation on a chronic vitamin K antagonist; a new in-hospital antibiotic has interacted with the anticoagulant and driven the INR well above range. Over the last day a gradual hemoglobin decline was noted with only mild left flank and low-back discomfort, no syncope and no melena. IR with same-day angiography, emergency surgery, ICU, and anticoagulation-reversal agents (vitamin K, 4-factor PCC) all available.',
    clinical:
      'Hemodynamically stable: BP 124 mmHg systolic, HR 92 (shock index ~0.74). Afebrile, no lower-limb neurologic deficit.',
    labs:
      'Hb 8.5 g/dL (down from 10.0 at admission), INR 4.6 (supratherapeutic, drug-interaction related; baseline therapeutic ~2.5), platelets 188 x10^9/L, fibrinogen 3.1 g/L, lactate 1.6 mmol/L.',
    ctReport:
      'Triphasic CT angiography of the abdomen and pelvis: large left iliopsoas (retroperitoneal) hematoma with three discrete foci of active arterial contrast extravasation increasing on the delayed phase. Feeding vessels appear to arise from the iliolumbar and lumbar arteries with an additional focus near the deep circumflex iliac artery. No active pulmonary or bronchial source. No free intraperitoneal blood.',
    source: {
      citation:
        'Torcia et al. Endovascular Embolization of Spontaneous Iliopsoas Hematoma: First Experience with Squidperi. Case Reports in Radiology. 2018.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/29992075/',
      pmid: '29992075',
      doi: '10.1155/2018/4694931',
    },
  },
  {
    id: 'marfan-systemic-collateral-hemoptysis',
    title: 'Massive hemoptysis on warfarin with supratherapeutic INR',
    demographics: '32-year-old man',
    anamnesis:
      'Marfan syndrome; prior Bentall procedure (mechanical aortic valve and ascending aortic graft) for a Stanford type A dissection, on lifelong warfarin with poor adherence and unmonitored dose escalation. Multiple prior thoracic operations for recurrent apical pulmonary cysts. Presents with sudden massive hemoptysis and dyspnea; bleeding was temporarily controlled at emergency bronchoscopy (continuous bleeding from the right apical segmental bronchus, tamponaded with topical epinephrine and thrombin). Warfarin held and vitamin K given. IR and thoracic surgery available on site.',
    clinical: 'BP 105/56 mmHg, HR 90 (shock index ~0.86). SpO2 94% on room air.',
    labs:
      'Hb 10.0 g/dL, PT-INR 5.21, aPTT 61.2 s (markedly supratherapeutic on warfarin), WBC 12.3 x10^9/L. Infection and connective-tissue serologies negative.',
    ctReport:
      'CT with maximum-intensity projection: multiple giant cystic lesions in both upper lobes and a right apical cyst with an air-fluid level and adjacent consolidation. An abnormal systemic vessel arising from the right subclavian artery extends into the apical cyst. No hypertrophied bronchial artery is identified and no discrete pulmonary-artery pseudoaneurysm is seen.',
    source: {
      citation:
        'Yabuuchi et al. A case of Marfan syndrome with massive haemoptysis from collaterals of the lateral thoracic artery. BMC Pulmonary Medicine. 2020.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/31914988/',
      pmid: '31914988',
      doi: '10.1186/s12890-019-1033-1',
    },
  },
  {
    id: 'post-tace-hepatic-pseudoaneurysm-hemobilia',
    title: 'Hemobilia from post-TACE hepatic artery pseudoaneurysm',
    demographics: '78-year-old man',
    anamnesis:
      'Hepatocellular carcinoma in liver segment 8 treated with five sessions of transarterial chemoembolization over the past five years, the most recent about a month ago; underlying cirrhosis. Presents with five days of melena. Not on anticoagulants or antiplatelet agents. IR and hepatobiliary surgery available on site.',
    clinical:
      'BP 80/50 mmHg, HR 101 (shock index ~1.26), temperature 38.4 C.',
    labs:
      'Hb 10.7 g/dL, platelets 200 x10^9/L, INR 1.09. Total bilirubin 5.6 mg/dL, albumin 3.0 g/dL, AST/ALT 106/69 U/L, GGT 533 U/L, amylase 1011 U/L, lipase 3686 U/L, hs-CRP 19.66 mg/dL; picture consistent with concurrent biliary sepsis.',
    ctReport:
      'CT: no active extravasation in the stomach or duodenum and no gastroesophageal varices. Hemobilia layering in the anterior right intrahepatic duct, common bile duct, and gallbladder. A pseudoaneurysm arises from the proximal segment 8 hepatic artery within the TACE-treated territory.',
    source: {
      citation:
        'Jang et al. Successful Endovascular Management of Pseudoaneurysm following Transarterial Chemoembolization: A Case Report. Medicina (Kaunas). 2024.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38792887/',
      pmid: '38792887',
      doi: '10.3390/medicina60050701',
    },
  },
  {
    id: 'emv-acquired-uterine-avm',
    title: 'Delayed uterine hemorrhage from acquired AVM / EMV',
    demographics: '32-year-old woman (G2P1011)',
    anamnesis:
      'Sudden heavy vaginal bleeding for one hour, soaking a pad every few minutes with passage of large clots, plus lightheadedness. Three months earlier she underwent dilation and evacuation for a second-trimester (22-week) twin pregnancy loss; menses had since returned to baseline. Not on any anticoagulant or antiplatelet agent. In the emergency department she had a syncopal episode and a massive transfusion protocol was activated (4 units packed red cells, 4 units fresh frozen plasma, 4 units platelets via rapid infuser), after which bleeding slowed and vitals normalized. IR, obstetric surgery, and a hybrid angiography suite available on site.',
    clinical:
      'Transient collapse to BP 87/44 mmHg, HR 133 (shock index ~1.5) during the syncopal episode; after transfusion, hemodynamically stabilized with bleeding now markedly reduced.',
    labs:
      'Hb 13.4 g/dL on arrival, falling to 11.5 g/dL after the bleed; platelets 355 x10^9/L; INR 1.0; serum beta-hCG negative; repeat coagulation studies unchanged (DIC excluded).',
    ctReport:
      'Transabdominal Doppler ultrasound: a prominent tortuous vessel communicating with the submucosal myometrium, read as an acquired uterine arteriovenous malformation (enhanced myometrial vascularity). Post-stabilization CTA confirmed enhanced myometrial vascularity with no discrete active contrast extravasation; the arteriovenous-shunt architecture was not characterized.',
    source: {
      citation:
        'Ault et al. Reframing the arteriovenous malformation paradigm: A case supporting conservative management of enhanced myometrial vascularity after uterine instrumentation. Radiology Case Reports. 2025.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/41551100/',
      pmid: '41551100',
      doi: '10.1016/j.radcr.2025.12.009',
    },
  },
];

/**
 * Picker presentation per preset (group, tier, one-line hook). Display only —
 * keyed by case id, never folded into the prompt. Keep ids in sync with PRESET_CASES.
 */
export const CASE_DISPLAY: Record<string, CaseDisplay> = {
  'post-polypectomy-bleed': {
    category: 'GI bleed',
    tier: 'starter',
    teaser: 'Active colonic extravasation',
  },
  'pelvic-trauma': {
    category: 'Trauma',
    tier: 'starter',
    teaser: 'Unstable pelvic blush',
  },
  'postpartum-hemorrhage': {
    category: 'Ob/Gyn',
    tier: 'starter',
    teaser: 'Refractory uterine atony',
  },
  hemoptysis: {
    category: 'Hemoptysis',
    tier: 'starter',
    teaser: 'Hypertrophied bronchial artery',
  },
  'post-ercp-hemorrhage': {
    category: 'GI bleed',
    tier: 'starter',
    teaser: 'Post-sphincterotomy, on apixaban',
  },
  'blunt-splenic-grade-iii-no-blush': {
    category: 'Trauma',
    tier: 'tough',
    teaser: 'Observe vs embolize vs splenectomy',
  },
  'blunt-hepatic-portal-vein-injury': {
    category: 'Trauma',
    tier: 'tough',
    teaser: 'Surgery vs embolize · portal, not arterial',
  },
  'ruptured-renal-aml-wunderlich': {
    category: 'Renal',
    tier: 'tough',
    teaser: 'Embolize vs nephrectomy',
  },
  'delayed-traumatic-ileal-rebleed': {
    category: 'GI bleed',
    tier: 'tough',
    teaser: 'CTA-negative rebleed',
  },
  'ruptured-ipda-celiac-occlusion': {
    category: 'Visceral aneurysm',
    tier: 'tough',
    teaser: 'Four-way split · find the culprit',
  },
  'pancreatitis-pseudoaneurysm-anticoag': {
    category: 'Visceral aneurysm',
    tier: 'tough',
    teaser: 'Re-embolize vs resect, on heparin',
  },
  'anticoagulant-iliopsoas-hematoma': {
    category: 'Retroperitoneal',
    tier: 'tough',
    teaser: 'Reverse anticoagulation vs embolize',
  },
  'marfan-systemic-collateral-hemoptysis': {
    category: 'Hemoptysis',
    tier: 'tough',
    teaser: 'Which vessel? Not the bronchial',
  },
  'post-tace-hepatic-pseudoaneurysm-hemobilia': {
    category: 'Hepatobiliary',
    tier: 'tough',
    teaser: 'Glue vs coils vs covered stent',
  },
  'emv-acquired-uterine-avm': {
    category: 'Ob/Gyn',
    tier: 'tough',
    teaser: 'Observe vs embolize',
  },
};

export function getCaseDisplay(id: string): CaseDisplay | undefined {
  return CASE_DISPLAY[id];
}
