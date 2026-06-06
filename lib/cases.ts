export interface PresetCase {
  id: string;
  title: string;
  vignette: string;
}

export const PRESET_CASES: PresetCase[] = [
  {
    id: 'post-polypectomy-bleed',
    title: 'Post-polypectomy colonic bleed',
    vignette:
      'A 72-year-old man presents with brisk hematochezia six hours after uncomplicated cecal polypectomy during screening colonoscopy. He is pale and diaphoretic with blood pressure 95/60 mmHg and heart rate 112. Hemoglobin fell from 9.1 to 7.4 g/dL despite crystalloid resuscitation. CTA demonstrates active arterial extravasation from a branch of the ileocolic artery at the prior polypectomy site. He takes aspirin for coronary disease. IR and surgery are available.',
  },
  {
    id: 'pelvic-trauma',
    title: 'Pelvic trauma',
    vignette:
      'A 34-year-old woman was struck by a motorcycle and arrives with an unstable Tile C pelvic ring fracture. Despite two units of packed red cells, she remains hypotensive at 80/55 mmHg with tachycardia. FAST is negative for intraperitoneal free fluid. CT angiography shows a focal arterial blush adjacent to the left internal iliac branch territory, concerning for pelvic arterial hemorrhage. She is intubated, on vasopressors, and coagulopathic with lactate 4.2.',
  },
  {
    id: 'postpartum-hemorrhage',
    title: 'Postpartum hemorrhage',
    vignette:
      'A 29-year-old woman has persistent postpartum hemorrhage three hours after spontaneous vaginal delivery of twins. Uterine atony has not responded to oxytocin, carboprost, misoprostol, or a Bakri balloon. Estimated blood loss is 2.1 liters with fibrinogen 1.6 g/L. She is tachycardic but maintaining MAP 65 mmHg on limited fluids, with borderline hemodynamics for IR transfer. Ultrasound shows an enlarged, boggy uterus without retained products.',
  },
  {
    id: 'hemoptysis',
    title: 'Hemoptysis',
    vignette:
      'A 58-year-old man with advanced cystic fibrosis presents with 350 mL of hemoptysis over 24 hours, his largest bleed to date. He is hemodynamically stable on supplemental oxygen with hemoglobin 10.8 g/dL. CTA chest demonstrates a markedly hypertrophied right bronchial artery supplying the right lower lobe without active contrast extravasation. Prior bronchoalveolar lavage cultures grow Pseudomonas. He is not a surgical candidate.',
  },
  {
    id: 'post-ercp-hemorrhage',
    title: 'Post-ERCP hemorrhage',
    vignette:
      'A 66-year-old woman on apixaban developed melena and symptomatic hypotension twelve hours after biliary sphincterotomy during ERCP for choledocholithiasis. Upper endoscopy could not identify or control a bleeding source in the duodenal papilla region. Hemoglobin has dropped 3 g/dL from baseline to 7.2. She received four units PRBC with transient response. CTA shows no active extravasation but duodenal wall hematoma. Anticoagulation held 18 hours.',
  },
];