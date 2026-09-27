import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const source = path.resolve('fabcon/EMFCC26_NotebookToBedside(2).pptx');
const out = path.resolve('.pptx-build/candidate.pptx');
const p = await PresentationFile.importPptx(await FileBlob.load(source));

const C = { green:'#004F46', teal:'#007D70', gold:'#D0A72C', ink:'#062E29', mist:'#EFF5F3', blue:'#1F5AA6', red:'#C94E4E', white:'#FFFFFF', gray:'#526360' };
const W=1280, H=720;
const img = async (file) => new Uint8Array(await fs.readFile(file));
const assets = {
  knee: await img('.pptx-build/notebook-images/exploration-02.png'),
  pr: await img('.pptx-build/notebook-images/modelling-01.png'),
  eTune: await img('.pptx-build/notebook-images/modelling-08.png'),
  eEval: await img('.pptx-build/notebook-images/modelling-09.png'),
  calib: await img('.pptx-build/notebook-images/calibration-01.png'),
  local: await img('.pptx-build/notebook-images/explainability-02.png'),
  heat: await img('.pptx-build/notebook-images/explainability-01.png'),
  importance: await img('.pptx-build/notebook-images/modelling-02.png'),
};

function shape(s, geometry, pos, fill='none', line='none') { return s.shapes.add({ geometry, position:pos, fill, line: line==='none' ? { fill:'none', width:0 } : line }); }
function text(s, value, pos, style={}) {
  const x=shape(s,'textbox',pos,'none','none'); x.text=value;
  x.text.style={ typeface:'Aptos', fontSize:style.size??24, color:style.color??C.ink, bold:style.bold??false, autoFit:'shrinkText', alignment:style.align??'left', verticalAlignment:style.valign??'top', ...(style.italic?{italic:true}:{}) };
  return x;
}
function footer(s, dark=false, n='') {
  shape(s,'rect',{left:0,top:676,width:W,height:44},{color:dark?'#003F38':C.green},'none');
  text(s,'EUROPEAN MICROSOFT FABRIC · SQL COMMUNITY CONFERENCE',{left:28,top:688,width:390,height:18},{size:10,color:C.white,bold:true});
  text(s,'#FABCON EUROPE     #SQLCON EUROPE',{left:815,top:686,width:420,height:20},{size:13,color:C.white,align:'right'});
  if(n) text(s,n,{left:1160,top:688,width:55,height:16},{size:10,color:'#DDEBE8',align:'right'});
}
function reset(i,dark=false) { const s=p.slides.getItem(i-1); s.shapes.deleteAll(); s.background.fill=dark?C.green:C.white; shape(s,'rect',{left:0,top:0,width:W,height:H},{color:dark?C.green:C.white},'none'); footer(s,dark,String(i)); return s; }
function title(s,t,sub='') { text(s,t,{left:70,top:48,width:1140,height:62},{size:34,bold:true,color:C.green}); if(sub) text(s,sub,{left:72,top:112,width:1050,height:32},{size:17,color:C.gray}); }
function image(s, bytes, pos, alt) { s.images.add({blob:bytes,contentType:'image/png',alt,fit:'contain',position:pos}); }
function label(s,t,pos,color=C.teal) { shape(s,'roundRect',pos,{color},'none'); text(s,t,{left:pos.left+12,top:pos.top+7,width:pos.width-24,height:pos.height-12},{size:14,bold:true,color:C.white,align:'center',valign:'middle'}); }
function divider(s,x,top=154,h=470) { shape(s,'line',{left:x,top,width:0,height:h},'none',{fill:'#B8CCC7',width:1}); }
function note(s,t) { s.speakerNotes.textFrame.setText(t); }

// 15 — the input contract
{ const s=reset(15); title(s,'NHS PROMs: the prediction starts before surgery','A pre-operative cohort, a six-month outcome, and a clinically meaningful threshold');
 text(s,'One row per episode',{left:76,top:184,width:360,height:45},{size:27,bold:true});
 text(s,'Pre-operative OKS, EQ-5D-3L, comorbidities, mobility and provider context form the feature set. The outcome arrives when the patient returns the questionnaire six months later.',{left:76,top:242,width:400,height:160},{size:21,color:C.gray});
 label(s,'PRE-OPERATIVE INPUTS',{left:76,top:438,width:238,height:36}); label(s,'OUTCOME AT 6 MONTHS',{left:76,top:490,width:238,height:36},C.gold);
 image(s,assets.knee,{left:540,top:170,width:650,height:420},'Knee patient Oxford Knee Score change distribution from the exploration notebook');
 text(s,'The knee cohort concentrates around a positive change, which makes the “poor outcome” definition a clinical choice rather than a generic label.',{left:540,top:600,width:650,height:48},{size:17,color:C.gray}); note(s,'Evidence: code/Finalized notebooks/01_all_dataset_exploration.ipynb'); }

// 16 — outcome definition
{ const s=reset(16); title(s,'What counts as a poor outcome?','Oxford Knee Score runs from 0 to 48. A 7-point improvement is used as the minimum clinically important difference.');
 shape(s,'roundRect',{left:80,top:190,width:460,height:270},{color:C.mist},'none'); text(s,'OKS at six months − OKS before surgery',{left:112,top:224,width:390,height:55},{size:25,bold:true});
 text(s,'< 7 points\nPoor outcome\n\n≥ 7 points\nMeaningful improvement',{left:112,top:305,width:300,height:118},{size:22,color:C.ink});
 shape(s,'rect',{left:112,top:385,width:130,height:10},{color:C.red},'none'); shape(s,'rect',{left:242,top:385,width:210,height:10},{color:C.teal},'none');
 text(s,'The model only receives information available before the decision to operate.',{left:650,top:220,width:445,height:86},{size:29,bold:true,color:C.green});
 text(s,'That keeps the score suitable for a pre-operative conversation. It does not diagnose a patient or decide treatment.',{left:650,top:340,width:445,height:105},{size:23,color:C.gray}); label(s,'CLINICAL DECISION SUPPORT',{left:650,top:490,width:326,height:42},C.green); note(s,'Threshold described in 2026-07-25-notebook-to-bedside-session-design.md and project notebooks.'); }

//17 exploration
{ const s=reset(17); title(s,'Exploration drove the modelling choices','The notebook outputs keep the choices inspectable instead of hiding them inside training code.'); image(s,assets.pr,{left:55,top:155,width:745,height:468},'Precision-recall and threshold exploration notebook output');
 text(s,'Three questions before training',{left:850,top:190,width:330,height:54},{size:27,bold:true});
 text(s,'How common is the poor-outcome class?\n\nWhich variables are missing by design?\n\nWhich threshold fits the capacity for follow-up?',{left:850,top:274,width:340,height:230},{size:21,color:C.gray}); label(s,'NOTEBOOK 31: READ-ONLY EXPLORATION',{left:842,top:555,width:345,height:36},C.teal); note(s,'Evidence: code/Finalized notebooks/05_modelling.ipynb; Fabric notebook 31_data_exploration is the production counterpart.'); }

//18 split
{ const s=reset(18); title(s,'Train and test split','The preprocessing pipeline is fitted on training data only. The held-out set stays untouched until evaluation.');
 const steps=[['01','Stratified split','Preserve the poor-outcome rate in both sets'],['02','Fit transforms','Imputation and encoding learn from training rows'],['03','Evaluate once','Use the held-out cohort for model comparison']];
 steps.forEach((a,k)=>{ const x=88+k*385; shape(s,'roundRect',{left:x,top:230,width:320,height:245},{color:k===1?'#E3F0ED':C.mist},'none'); text(s,a[0],{left:x+26,top:252,width:70,height:46},{size:31,bold:true,color:C.gold}); text(s,a[1],{left:x+26,top:320,width:250,height:42},{size:23,bold:true}); text(s,a[2],{left:x+26,top:382,width:252,height:60},{size:17,color:C.gray}); });
 text(s,'Leakage prevention is part of the model design, not a last-minute validation check.',{left:150,top:550,width:950,height:42},{size:26,bold:true,color:C.green,align:'center'}); note(s,'Design based on fabric/notebooks/40_train_register.ipynb.'); }

//19 model selection
{ const s=reset(19); title(s,'Model selection favoured an explainable model','The experiment compared linear baselines, tree models and an Explainable Boosting Machine.'); image(s,assets.eTune,{left:58,top:160,width:710,height:468},'EBM hyperparameter tuning results from model notebook');
 text(s,'Why the EBM?',{left:835,top:190,width:300,height:44},{size:28,bold:true}); text(s,'It provides a calibrated risk score and a direct explanation of how each input shifts risk.\n\nThat lets clinicians inspect both the model-wide pattern and the individual prediction.',{left:835,top:266,width:335,height:190},{size:21,color:C.gray}); label(s,'GLASSBOX MODEL',{left:835,top:520,width:220,height:38},C.green); note(s,'Evidence: code/Finalized notebooks/05_modelling.ipynb and Model_Comparison_Analysis.md.'); }

//20 evaluation
{ const s=reset(20); title(s,'Performance depends on the threshold','Precision rises as the flagging threshold rises. Recall falls. The operating point is a care-pathway decision.'); image(s,assets.eEval,{left:58,top:160,width:710,height:468},'Saved EBM test set evaluation across thresholds');
 text(s,'A score is not a decision',{left:830,top:188,width:330,height:48},{size:28,bold:true}); text(s,'The model estimates risk. The service chooses the threshold based on how many patients it can support and the cost of missed cases.',{left:830,top:260,width:340,height:130},{size:21,color:C.gray});
 shape(s,'roundRect',{left:830,top:430,width:334,height:115},{color:C.mist},'none'); text(s,'Threshold\nPolicy choice',{left:860,top:452,width:260,height:65},{size:24,bold:true,color:C.green,align:'center'}); note(s,'Evidence: code/Finalized notebooks/05_modelling.ipynb; threshold is explicitly described as clinical policy in fabric/rayfin-clinician-app/src/clinical.ts.'); }

//21 section
{ const s=reset(21,true); text(s,'A model a clinician can argue with',{left:85,top:230,width:1090,height:86},{size:54,bold:true,color:C.gold,align:'center'}); text(s,'Global behaviour, local explanations, and calibration',{left:220,top:345,width:840,height:48},{size:26,color:C.white,align:'center'}); }

//22 calibration
{ const s=reset(22); title(s,'Calibration makes a risk score interpretable','When the model estimates 34%, the observed poor-outcome rate should be close to 34% for similar patients.'); image(s,assets.calib,{left:65,top:160,width:800,height:440},'EBM calibration curve and predicted probability distribution');
 text(s,'A probability needs a reality check',{left:910,top:205,width:250,height:78},{size:28,bold:true}); text(s,'The curve follows the diagonal closely across the observed probability range. The distribution shows most patients below high-risk territory.',{left:910,top:320,width:245,height:160},{size:20,color:C.gray}); label(s,'CALIBRATED EBM',{left:910,top:535,width:210,height:36},C.teal); note(s,'Evidence: code/Finalized notebooks/06_ebm_calibration.ipynb.'); }

//23 explanations
{ const s=reset(23); title(s,'Each patient receives a local explanation','The model exposes signed feature contributions instead of a black-box score.'); image(s,assets.local,{left:45,top:165,width:870,height:430},'Patient-level feature contribution plots from explainability notebook');
 text(s,'What changes the conversation',{left:950,top:190,width:240,height:62},{size:26,bold:true}); text(s,'The clinician can see which pre-operative factors push risk up or down, then decide whether the result fits the patient’s context.',{left:950,top:285,width:230,height:174},{size:20,color:C.gray}); label(s,'LOCAL EXPLANATION',{left:950,top:520,width:210,height:36},C.green); note(s,'Evidence: code/Finalized notebooks/07_ebm_explainability.ipynb.'); }

//24 global
{ const s=reset(24); title(s,'Global patterns remain inspectable','A transparent model supports a discussion about patterns across the cohort as well as a discussion about one patient.'); image(s,assets.importance,{left:42,top:160,width:780,height:440},'Feature importance comparison from modelling notebook');
 text(s,'Two views of the same model',{left:865,top:192,width:300,height:54},{size:27,bold:true}); text(s,'Global view\nWhich pre-operative features matter most across the cohort?\n\nLocal view\nWhy did this patient receive this score?',{left:865,top:278,width:300,height:205},{size:20,color:C.gray}); note(s,'Evidence: code/Finalized notebooks/05_modelling.ipynb and 07_ebm_explainability.ipynb.'); }

//25 audit
{ const s=reset(25); title(s,'A score must survive an audit','The model record joins the data version, feature set, threshold and model version to the clinical decision.');
 const nodes=[['Gold table','Delta version'],['Training run','Parameters + metrics'],['Registered model','Version + tags'],['Patient score','Risk + explanation'],['Review decision','Clinician record']];
 nodes.forEach((n,k)=>{const x=52+k*236; shape(s,'roundRect',{left:x,top:305,width:190,height:130},{color:k===2?'#E3F0ED':C.mist},'none'); text(s,n[0],{left:x+14,top:330,width:160,height:28},{size:18,bold:true,align:'center'}); text(s,n[1],{left:x+14,top:373,width:160,height:34},{size:16,color:C.gray,align:'center'}); if(k<4) text(s,'›',{left:x+193,top:344,width:32,height:35},{size:32,bold:true,color:C.gold,align:'center'});});
 text(s,'“Which input created this score, and who acted on it?”',{left:170,top:520,width:940,height:45},{size:28,bold:true,color:C.green,align:'center'}); note(s,'Design based on fabric/MLFLOW.md, fabric/notebooks/40_train_register.ipynb and fabric/DAY_PLAN.md.'); }

//26 experiment
{ const s=reset(26); title(s,'From experiment to registered model','Fabric keeps the training lineage and the deployable model in the same governed estate.');
 text(s,'ML experiment',{left:112,top:208,width:260,height:38},{size:26,bold:true,color:C.green}); text(s,'Each training run records metrics and explicit tags such as data version and interpretability.',{left:112,top:265,width:265,height:120},{size:20,color:C.gray});
 text(s,'Registered model',{left:508,top:208,width:280,height:38},{size:26,bold:true,color:C.green}); text(s,'The selected calibrated EBM receives a version and a champion alias before it reaches scoring.',{left:508,top:265,width:270,height:120},{size:20,color:C.gray});
 text(s,'Scored cohort',{left:908,top:208,width:250,height:38},{size:26,bold:true,color:C.green}); text(s,'Batch scoring writes risk and explanation tables that the clinician app reads.',{left:908,top:265,width:250,height:120},{size:20,color:C.gray});
 [292,688].forEach(x=>text(s,'›',{left:x,top:305,width:70,height:50},{size:52,bold:true,color:C.gold,align:'center'}));
 shape(s,'roundRect',{left:160,top:485,width:960,height:72},{color:C.mist},'none'); text(s,'No model file needs to leave the estate to reach the workflow.',{left:200,top:506,width:880,height:32},{size:23,bold:true,color:C.green,align:'center'}); note(s,'Evidence: fabric/notebooks/40_train_register.ipynb, 50_batch_score.ipynb and fabric/README.md.'); }

//27 delivery
{ const s=reset(27,true); text(s,'Delivery inside the governed estate',{left:85,top:220,width:1100,height:74},{size:51,bold:true,color:C.gold,align:'center'}); text(s,'Versioned model · scored cohort · clinician workflow · access policy',{left:175,top:340,width:930,height:44},{size:25,color:C.white,align:'center'}); }

//28 endpoint
{ const s=reset(28); title(s,'The score carries its own evidence','The endpoint response brings risk, threshold, top contributions and lineage metadata together.');
 shape(s,'roundRect',{left:70,top:165,width:690,height:440},{color:'#073C35'},'none'); text(s,'{\n  "episode_id": "…",\n  "risk": 0.34,\n  "threshold": 0.50,\n  "flagged": false,\n  "contributions": [ … ],\n  "model_version": "champion",\n  "gold_table_version": 7\n}',{left:120,top:205,width:580,height:330},{size:22,color:'#E8F5F2'});
 text(s,'The response is designed for the next human question:',{left:835,top:205,width:320,height:70},{size:27,bold:true,color:C.green}); text(s,'“Why this score?”\n\n“Which model and data version produced it?”\n\n“Was the patient flagged at the active threshold?”',{left:835,top:315,width:340,height:170},{size:21,color:C.gray}); note(s,'Payload fields based on fabric/notebooks/50_batch_score.ipynb and the clinician app data model. Example values are illustrative.'); }

//29 app
{ const s=reset(29); title(s,'The clinician app turns a score into a review task','The app uses the scored cohort and explanation tables, without exposing a generic model interface to a clinician.');
 shape(s,'roundRect',{left:80,top:175,width:470,height:410},{color:C.mist},'none'); text(s,'Patient review',{left:116,top:215,width:320,height:42},{size:28,bold:true}); text(s,'Risk band\nHigh\n\nWhy?\nReduced mobility\nBaseline pain\nPrior surgery\n\nRecord decision',{left:116,top:292,width:300,height:230},{size:21,color:C.gray});
 text(s,'The workflow supports judgement, not automation',{left:650,top:210,width:450,height:52},{size:31,bold:true,color:C.green}); text(s,'A model score identifies a patient for review. The clinician sees the explanation, adds context and records the decision. The app does not make the care decision.',{left:650,top:300,width:450,height:155},{size:23,color:C.gray}); label(s,'RISK + EXPLANATION + DECISION',{left:650,top:510,width:370,height:40},C.teal); note(s,'Evidence: fabric/rayfin-clinician-app/src/pages and UX_AUDIT_AND_DESIGN.md. Layout is a conceptual representation, not a production screenshot.'); }

//30 RLS
{ const s=reset(30); title(s,'Row-level security sits beside the data','The access rule is evaluated by Data API Builder before a patient row reaches the app.');
 shape(s,'roundRect',{left:85,top:195,width:485,height:270},{color:'#073C35'},'none'); text(s,'policy: (claims, item) =>\n  claims.sub\n    .eq(item.assignedClinicianId)\n    .or(\n      claims.email.eq(\n        item.assignedClinicianEmail\n      )\n    )',{left:120,top:230,width:415,height:190},{size:18,color:'#E8F5F2'});
 text(s,'No client-side filter',{left:700,top:215,width:340,height:44},{size:29,bold:true,color:C.red}); text(s,'Filtering in the frontend only hides rows in one screen. The data policy protects every request, including deep links and API calls.',{left:700,top:285,width:380,height:120},{size:22,color:C.gray}); label(s,'ENFORCED IN DATA API BUILDER',{left:700,top:465,width:350,height:40},C.green); note(s,'Source: fabric/rayfin-clinician-app/rayfin/data/PatientRisk.ts and RiskExplanation.ts.'); }

//31 grounded answers
{ const s=reset(31); title(s,'A grounded answer, or none','The agent can answer from the governed model outputs and provider context, with the same permission boundary.');
 const chain=[['Question','Which patients are flagged and why?'],['Semantic layer','Risk, explanation and provider data'],['Permission check','Caller can only see assigned patients'],['Answer','Cited, scoped response']];
 chain.forEach((n,k)=>{ const x=65+k*295; shape(s,'roundRect',{left:x,top:290,width:240,height:155},{color:k===2?'#E3F0ED':C.mist},'none'); text(s,n[0],{left:x+16,top:318,width:208,height:28},{size:20,bold:true,color:C.green,align:'center'}); text(s,n[1],{left:x+18,top:365,width:204,height:55},{size:16,color:C.gray,align:'center'}); if(k<3) text(s,'›',{left:x+240,top:340,width:55,height:50},{size:42,bold:true,color:C.gold,align:'center'});});
 text(s,'The answer should remain traceable to the scored tables and the caller’s permissions.',{left:140,top:530,width:1000,height:38},{size:24,bold:true,color:C.green,align:'center'}); note(s,'Evidence: fabric/rayfin-clinician-app/src/services/agent and fabric/README.md.'); }

//32 close
{ const s=reset(32,true); text(s,'The missing layer is delivery with evidence',{left:95,top:135,width:1050,height:70},{size:47,bold:true,color:C.gold,align:'center'});
 const ps=[['Clinician','Risk, explanation and a recorded decision'],['Patient','A clear, calibrated probability'],['Regulator','Lineage, model version and access policy']]; ps.forEach((n,k)=>{const x=90+k*370; shape(s,'roundRect',{left:x,top:290,width:310,height:185},{color:'#0B655A'},'none'); text(s,n[0],{left:x+22,top:326,width:266,height:32},{size:25,bold:true,color:C.gold,align:'center'}); text(s,n[1],{left:x+28,top:386,width:254,height:55},{size:18,color:C.white,align:'center'});}); text(s,'Data, analytics and decision remain in one governed place.',{left:160,top:545,width:960,height:36},{size:25,color:C.white,align:'center'}); }

//33 transfer
{ const s=reset(33); title(s,'What transfers to the next project','The reusable work is not only the model. It is the governed path from data to decision.');
 const items=[['1','Version the inputs','Record the Delta table and feature-set version with each run'],['2','Make explanations first-class','Store local explanations beside the score'],['3','Treat thresholds as policy','Connect flagging volume to the care pathway'],['4','Enforce access in the data layer','Do not rely on a frontend filter'],['5','Keep a usable fallback','Pre-run notebooks and offline app mode for the demo']];
 items.forEach((a,k)=>{const y=168+k*88; text(s,a[0],{left:92,top:y,width:42,height:35},{size:25,bold:true,color:C.gold,align:'center'}); text(s,a[1],{left:160,top:y,width:330,height:30},{size:20,bold:true}); text(s,a[2],{left:515,top:y,width:650,height:34},{size:18,color:C.gray}); shape(s,'line',{left:160,top:y+56,width:1000,height:0},'none',{fill:'#D4E1DE',width:1});}); note(s,'Evidence: fabric/DAY_PLAN.md, fabric/README.md, fabric/MLFLOW.md and clinician-app README.'); }

await (await PresentationFile.exportPptx(p)).save(out);
