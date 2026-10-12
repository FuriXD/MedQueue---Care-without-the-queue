import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/ariz/Documents/ChatGPT/Mini-Project";
const SKILL_DIR = "/Users/ariz/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations";
const RUNTIME_PYTHON = "/Users/ariz/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const FINAL_PPTX = path.join(workspaceDir, "output", "MediFlow_Mini_Project_Review_Deliverable.pptx");
const templatePath = path.join(workspaceDir, ".build-medi-flow", "template.pptx");
const stagingDir = path.join(workspaceDir, ".codex-finalizer");
const navy = "#243F62";
const red = "#A23434";
const gray = "#555555";
const light = "#F4F6FA";

const deck = await PresentationFile.importPptx(await FileBlob.load(templatePath));
const cover = deck.slides.items[0];
const contents = deck.slides.items[1];

function addText(slide, text, left, top, width, height, size = 24, color = "#111111", opts = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = text;
  box.text.style = {
    fontFamily: "Times New Roman",
    fontSize: size,
    color,
    bold: Boolean(opts.bold),
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
  };
  box.text.insets = 0;
  return box;
}

function addRule(slide, top) {
  slide.shapes.add({ geometry: "rect", position: { left: 66, top, width: 8, height: 70 }, fill: red, line: { style: "solid", fill: red, width: 0 } });
}

function clearContentSlide(slide) {
  for (const shape of slide.shapes.items) {
    const text = String(shape.text);
    if (text === "Problem Statement" || text.startsWith("CONTENTS") || text.startsWith("Introduction\nProblem Statement")) {
      shape.text = "";
    }
  }
}

function addTitle(slide, title, subtitle = "") {
  addRule(slide, 105);
  addText(slide, title, 100, 105, 1060, 55, 34, navy, { bold: true });
  if (subtitle) addText(slide, subtitle, 102, 160, 1040, 30, 17, red, { bold: true });
  slide.shapes.add({ geometry: "rect", position: { left: 100, top: 198, width: 1050, height: 2 }, fill: "#D8DDE5", line: { style: "solid", fill: "#D8DDE5", width: 0 } });
}

function addBullets(slide, items, { left = 125, top = 230, width = 980, fontSize = 23, lineHeight = 55 } = {}) {
  items.forEach((item, i) => {
    addText(slide, "•", left, top + i * lineHeight, 22, 30, fontSize + 3, red, { bold: true });
    addText(slide, item, left + 34, top + i * lineHeight, width - 34, lineHeight - 4, fontSize, "#171717");
  });
}

function contentSlide(title, subtitle = "") {
  const slide = contents.duplicate();
  slide.moveTo(deck.slides.items.length - 1);
  clearContentSlide(slide);
  addTitle(slide, title, subtitle);
  return slide;
}

// Cover
deck.resolve("sh/k3yl0zql").text = "MediFlow: An Intelligent Virtual Crowd\nManagement Platform\n\nSubmitted by:\nStudent Name(s) (USN)\n\nUNDER THE GUIDANCE OF:\nFaculty Guide\nDepartment of CSE\nBMSIT&M\n2026–27";
deck.resolve("sh/k3yl0zql").text.style = { fontFamily: "Times New Roman", fontSize: 18, color: "#555555", bold: true, alignment: "center" };

// Contents
deck.resolve("sh/ozy1ofad").text = "CONTENTS";
deck.resolve("sh/w3i1sfa9").text = "Introduction\nProblem Statement\nObjectives\nExisting and Proposed System\nMajor Modules\nHybrid Queue Optimization\nSystem Workflow and Architecture\nTechnology Stack and Database Design\nSample Use Case\nExpected Benefits and Future Enhancements\nConclusion";
deck.resolve("sh/w3i1sfa9").text.style = { fontFamily: "Times New Roman", fontSize: 28, color: "#000000", bold: true, alignment: "left" };

// 3 Introduction
let s = contentSlide("Introduction", "Virtual queues reduce unnecessary waiting inside care facilities");
addBullets(s, [
  "Hospitals and diagnostic centers often face congestion at registration, consultation, labs, pharmacy, and billing.",
  "Long physical queues delay care, strain staff, and increase infection exposure for vulnerable patients.",
  "MediFlow gives patients a digital token, estimated waiting time, and arrival recommendation.",
  "A live dashboard helps staff see queue growth, service delays, capacity, and crowding risk.",
], { fontSize: 22, lineHeight: 70 });

// 4 Problem
s = contentSlide("Problem Statement", "Manual and first-come-first-served queues cannot adapt to clinical reality");
addBullets(s, [
  "Urgency, age risk, appointments, walk-ins, and emergency cases require different treatment.",
  "Doctor delays and variable consultation times make static appointment registers unreliable.",
  "Patients move through dependent stages such as registration, consultation, lab testing, and pharmacy.",
  "Administrators lack early warning when peak-hour demand exceeds seating or service capacity.",
], { fontSize: 22, lineHeight: 70 });

// 5 Objectives
s = contentSlide("Project Objectives", "Patient-focused flow management with operational visibility");
addBullets(s, [
  "Reduce crowding in waiting areas through virtual tokens and suggested arrival times.",
  "Provide real-time queue position and estimated waiting-time ranges.",
  "Prioritize emergency and high-risk patients while preventing excessive routine waits.",
  "Predict peak load and help staff allocate counters, rooms, doctors, and technicians.",
  "Maintain a digital movement record for each patient service stage.",
], { fontSize: 22, lineHeight: 58 });

// 6 Existing vs proposed
s = contentSlide("Existing System and MediFlow", "From manual queue handling to adaptive patient flow");
addText(s, "Existing approach", 125, 235, 420, 36, 26, red, { bold: true, align: "center" });
addText(s, "MediFlow approach", 680, 235, 420, 36, 26, navy, { bold: true, align: "center" });
const leftItems = ["Paper slips or isolated registers", "First-come-first-served lines", "Manual delay communication", "Limited visibility of queue load"];
const rightItems = ["Digital tokens from app, kiosk, web, or reception", "Weighted priority queue", "Live alerts and revised arrival times", "Dashboard with capacity and crowd-risk signals"];
leftItems.forEach((x, i) => { addText(s, "•", 130, 298 + i*62, 20, 30, 23, red, {bold:true}); addText(s, x, 158, 298 + i*62, 390, 52, 20, "#222222"); });
rightItems.forEach((x, i) => { addText(s, "•", 685, 298 + i*62, 20, 30, 23, navy, {bold:true}); addText(s, x, 713, 298 + i*62, 400, 52, 20, "#222222"); });
s.shapes.add({ geometry: "line", position: { left: 620, top: 285, width: 0, height: 280 }, line: { style: "solid", fill: "#C5CBD3", width: 2 } });

// 7 Modules
s = contentSlide("Major Modules", "A connected service layer for patients and hospital teams");
const modules = [
  ["Patient registration", "Appointments, walk-in tokens, referrals, and queue status"],
  ["Smart virtual queue", "Token display, patients ahead, ETA, and arrival prompts"],
  ["Priority allocation", "Urgency, age risk, appointment status, and waiting time"],
  ["Prediction and alerts", "Waiting-time estimation and crowd-risk detection"],
  ["Admin dashboard", "Queues, staff status, capacity, analytics, and action alerts"],
];
modules.forEach(([head, body], i) => {
  const y = 230 + i * 68;
  s.shapes.add({ geometry: "rect", position: { left: 120, top: y, width: 270, height: 48 }, fill: light, line: { style: "solid", fill: "#D8DDE5", width: 1 } });
  addText(s, head, 138, y + 10, 235, 26, 19, navy, { bold: true });
  addText(s, body, 430, y + 9, 670, 36, 19, "#222222");
});

// 8 Algorithms
s = contentSlide("Hybrid Queue Optimization", "Priority-based allocation plus machine-learning prediction");
addText(s, "Priority score", 125, 235, 330, 32, 25, navy, { bold: true });
addText(s, "(Urgency × Wu) + (Age Risk × Wa) +\n(Appointment Status × Ws) + (Waiting Time × Ww)", 125, 280, 465, 75, 22, "#222222", { align: "center" });
addText(s, "Waiting-time model", 690, 235, 350, 32, 25, navy, { bold: true });
addText(s, "Inputs: queue length, doctor, service type,\nstaff availability, delays, and historical durations\nOutput: an estimated range, such as 18–25 minutes", 680, 280, 390, 94, 20, "#222222", { align: "center" });
addText(s, "Crowd-risk score", 125, 440, 330, 32, 25, red, { bold: true });
addText(s, "(Current Patients + Predicted Arrivals)\n÷ Available Service Capacity", 135, 485, 400, 60, 22, "#222222", { align: "center" });
addText(s, "Risk levels", 690, 440, 350, 32, 25, red, { bold: true });
addText(s, "Green  Low     Yellow  Moderate\nOrange  High     Red  Critical overcrowding", 690, 490, 370, 60, 20, "#222222", { align: "center" });

// 9 Workflow
s = contentSlide("System Workflow", "Virtual token issue through service completion");
const steps = ["Register", "Verify or create\nwalk-in entry", "Issue digital\ntoken", "Apply priority\nqueue", "Predict wait\ntime", "Notify and\ncall patient", "Complete or\nmove to next stage"];
steps.forEach((label, i) => {
  const x = 85 + i * 155;
  s.shapes.add({ geometry: "roundRect", position: { left: x, top: 310, width: 125, height: 90 }, fill: i % 2 ? "#F2F5FA" : "#FBEFEF", line: { style: "solid", fill: i % 2 ? navy : red, width: 1.5 }, borderRadius: "rounded-lg" });
  addText(s, String(i + 1), x + 48, 324, 30, 20, 15, i % 2 ? navy : red, { bold: true, align: "center" });
  addText(s, label, x + 10, 350, 105, 42, 15, "#222222", { bold: true, align: "center" });
  if (i < steps.length - 1) addText(s, "›", x + 128, 335, 22, 30, 30, red, { bold: true, align: "center" });
});
addText(s, "At every update, the dashboard recalculates wait estimates and checks crowd risk.", 165, 470, 820, 35, 21, gray, { align: "center" });

// 10 Architecture
s = contentSlide("Proposed System Architecture", "Real-time patient flow from entry points to operational decisions");
const cols = [
  ["Entry channels", "Mobile app\nHospital kiosk\nWebsite\nReception"],
  ["MediFlow core", "Token service\nPriority queue\nML prediction\nNotification engine"],
  ["Operations", "Admin dashboard\nDoctor and lab status\nCapacity alerts\nAnalytics"],
];
cols.forEach(([h,b], i) => { const x=125+i*365; s.shapes.add({geometry:"roundRect",position:{left:x,top:275,width:280,height:225},fill:i===1?"#EEF2F8":"#FAFAFA",line:{style:"solid",fill:i===1?navy:"#BFC7D2",width:1.5},borderRadius:"rounded-lg"}); addText(s,h,x+18,300,244,30,22,i===1?navy:red,{bold:true,align:"center"}); addText(s,b,x+28,350,225,110,20,"#222222",{align:"center"}); if(i<2)addText(s,"›",x+291,365,45,48,42,red,{bold:true,align:"center"}); });

// 11 Stack and data
s = contentSlide("Technology Stack and Data Design", "Suggested mini-project implementation choices");
const tech = [
  "Frontend: React.js, HTML, CSS, Bootstrap",
  "Mobile: Flutter or React Native",
  "Backend: Python Flask/Django or Node.js",
  "Data and ML: MySQL/PostgreSQL, Python, Scikit-learn, Pandas",
  "Real-time updates: Firebase, Socket.IO, or WebSockets",
];
addText(s, "Technology stack", 125, 230, 430, 32, 25, navy, {bold:true});
addBullets(s, tech, { left: 125, top: 280, width: 490, fontSize: 18, lineHeight: 56 });
addText(s, "Core data entities", 690, 230, 380, 32, 25, red, {bold:true});
addBullets(s, ["Patients and appointments", "Tokens and queue logs", "Doctors and departments", "Crowd metrics and notifications"], { left: 690, top: 280, width: 390, fontSize: 19, lineHeight: 58 });

// 12 Use case
s = contentSlide("Sample Use Case", "Priya’s dermatology consultation");
const use = [
  ["10:00 AM", "Priya books a consultation and receives token D-27."],
  ["Queue status", "The system sees 18 active patients, a 12-minute delay, and a 9-minute average consultation."],
  ["10:30 AM", "MediFlow advises Priya to arrive at the dermatology waiting area."],
  ["10:25 AM", "An alert reports that only two patients remain before her turn and directs her to Room 204."],
];
use.forEach(([time, detail],i)=>{ const y=235+i*78; addText(s,time,125,y,145,30,21,i%2?red:navy,{bold:true}); s.shapes.add({geometry:"line",position:{left:280,top:y+10,width:0,height:45},line:{style:"solid",fill:"#BFC7D2",width:2}}); addText(s,detail,315,y,770,52,20,"#222222"); });

// 13 Benefits/Future
s = contentSlide("Expected Benefits and Future Enhancements", "Near-term operational impact and expansion path");
addText(s, "Expected benefits", 125, 230, 400, 32, 25, navy, {bold:true});
addBullets(s, ["Shorter perceived and actual wait times", "Less congestion and infection exposure", "Better use of clinical staff and rooms", "More transparent patient communication"], { left:125, top:280, width:450, fontSize:19, lineHeight:58});
addText(s, "Future enhancements", 680, 230, 400, 32, 25, red, {bold:true});
addBullets(s, ["EHR integration and QR check-in", "Indoor navigation and multilingual access", "Privacy-governed CCTV crowd counting", "Predictive staffing and teleconsultation options"], { left:680, top:280, width:400, fontSize:19, lineHeight:58});

// 14 Conclusion
s = contentSlide("Conclusion", "A practical mini-project scope for smart healthcare flow management");
addBullets(s, [
  "MediFlow replaces unmanaged physical waiting with virtual tokens, priority rules, and live updates.",
  "Machine-learning estimates and crowd-risk alerts help hospitals act before congestion becomes critical.",
  "The demonstrable core includes registration, token generation, priority queues, wait prediction, dashboard monitoring, and notifications.",
  "The design can scale into a broader healthcare operations platform as data and integrations mature.",
], { fontSize: 22, lineHeight: 68 });
addText(s, "Thank You", 450, 555, 360, 48, 32, red, {bold:true,align:"center"});

await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
const candidatePath = path.join(stagingDir, "MediFlow_candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);
await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "reference", families: ["Times New Roman", "Calibri"], referencePath: templatePath, referenceSha256: "6448fe11fffa2d5c42d29c4bc11ebae5f3869ddf3c551b6b5e6dba9e08bf4867" },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "MediFlow_validation_deliverable.json"),
});
console.log(FINAL_PPTX);
