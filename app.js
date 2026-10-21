import { analyzeGlobalOutputs } from "./fingerprint-core.js";
import { generateChallenges } from "./challenge-browser.js";

const $ = (id) => document.getElementById(id);
const state = { bank: null, challenges: [] };
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const percent = (value) => `${(value * 100).toFixed(1)}%`;
let toastTimer;

function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3000);
}

function showError(message = "") {
  $("test-error").textContent = message;
  $("test-error").hidden = !message;
}

async function copyPrompt(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("完整题目已复制。");
  } catch {
    toast("未能访问剪贴板，请选择题目文字手动复制。");
  }
}

function filledCount() {
  const filled = state.challenges.filter((_, i) => $(`answer-${i}`).value.trim()).length;
  $("filled-count").textContent = `已填写 ${filled} / 3 份回答`;
  state.challenges.forEach((_, i) => { $(`answer-status-${i}`).textContent = $(`answer-${i}`).value.trim() ? "已填写" : ""; });
}

function renderChallenges() {
  state.challenges = generateChallenges(3);
  $("challenge-list").innerHTML = state.challenges.map((challenge, index) => `<article class="challenge">
    <div class="challenge-heading"><div class="challenge-label"><span class="number">${index + 1}</span><label for="answer-${index}">挑战 ${index + 1}</label><span class="challenge-meta">${challenge.expected_count} 个数字</span><span class="answer-status" id="answer-status-${index}"></span></div><button type="button" class="copy-button" data-copy="${index}" aria-label="复制挑战 ${index + 1} 的完整题目">${icon("copy")}复制题目</button></div>
    <p class="prompt-text" tabindex="0" aria-label="挑战 ${index + 1} 提示词">${escapeHtml(challenge.prompt)}</p>
    <textarea id="answer-${index}" rows="3" spellcheck="false" placeholder="在这里粘贴模型的完整回答，保留原始数字和格式…"></textarea>
  </article>`).join("");
  $("challenge-list").querySelectorAll("textarea").forEach((input) => input.addEventListener("input", filledCount));
  $("challenge-list").querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copyPrompt(state.challenges[Number(button.dataset.copy)].prompt)));
  filledCount();
}

function rankRows(items) {
  return items.map((item) => `<div class="rank-row"><span class="rank-name">${escapeHtml(item.display_name)}</span><span class="rank-value">${percent(item.probability)}</span><div class="rank-bar"><span style="width:${Math.max(0, Math.min(100, item.probability * 100))}%"></span></div></div>`).join("");
}

function renderResult(data) {
  const winner = data.results[0];
  const diagnostics = data.diagnostics.map((item, index) => `回答 ${index + 1}：${item.parsed_numbers} 个有效数字${item.accepted ? "" : "（未计入）"}`).join("<br>");
  $("result-card").innerHTML = `<div class="card-heading"><div class="section-title"><span class="step-square">02</span><h2>识别结果</h2></div><span class="neutral-badge">已比较 ${data.results.length} 个模型</span></div>
    <div class="result-body"><p class="result-kicker">最接近的已收录模型</p><h3 class="winner-name">${escapeHtml(winner.display_name)}</h3>
      <div class="winner-line"><span class="family-badge">${escapeHtml(winner.family_name)}</span><span>基于 ${data.used_outputs} 份有效回答</span></div>
      <div class="winner-probability">${(winner.probability * 100).toFixed(1)}<span>%</span></div><p class="probability-caption">当前候选库内的相对概率</p>
      <div class="rank-list"><p class="rank-title">候选模型排名</p>${rankRows(data.results.slice(0, 3))}</div>
      ${data.results.length > 3 ? `<details class="all-candidates"><summary>查看其余 ${data.results.length - 3} 个候选</summary>${rankRows(data.results.slice(3))}</details>` : ""}
      <div class="result-diagnostics">${diagnostics}</div>
      ${data.used_outputs < 3 ? `<div class="partial-warning">仅有 ${data.used_outputs} 份回答被计入，建议补齐 3 份有效回答后再判断。</div>` : ""}
    </div>`;
}

$("analyze").addEventListener("click", () => {
  showError();
  if (!state.bank) { showError("指纹库尚未加载完成，请稍候。"); return; }
  try {
    const outputs = state.challenges.map((challenge, index) => ({ text: $(`answer-${index}`).value, expected_count: challenge.expected_count }));
    renderResult(analyzeGlobalOutputs(outputs, state.bank));
    if (innerWidth < 980) $("result-card").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  } catch (error) {
    showError(error.message);
  }
});

$("refresh-challenges").addEventListener("click", () => {
  if (state.challenges.some((_, index) => $(`answer-${index}`).value.trim()) && !confirm("换题会清空已填写的回答，继续吗？")) return;
  showError();
  renderChallenges();
});

document.querySelectorAll("[data-help]").forEach((button) => button.addEventListener("click", () => $("help-dialog").showModal()));
$("close-help").addEventListener("click", () => $("help-dialog").close());
$("help-done").addEventListener("click", () => $("help-dialog").close());

async function initialize() {
  try {
    const response = await fetch(new URL("./bank.json", import.meta.url), { cache: "no-cache" });
    if (!response.ok) throw new Error(`指纹库加载失败（HTTP ${response.status}）`);
    const bank = await response.json();
    if (!Array.isArray(bank.models) || !bank.models.length || !bank.robust || !bank.calibration) throw new Error("指纹库格式不正确");
    state.bank = bank;
    const counts = { model_count: bank.models.length, response_count: bank.models.reduce((sum, model) => sum + model.response_count, 0), family_count: new Set(bank.models.map((model) => model.family)).size };
    document.querySelectorAll("[data-stat]").forEach((element) => { element.textContent = counts[element.dataset.stat].toLocaleString("zh-CN"); });
    renderChallenges();
    $("connection-state").textContent = "指纹库已就绪 · 本地计算";
    $("analyze").disabled = false;
    $("refresh-challenges").disabled = false;
  } catch (error) {
    $("connection-state").textContent = "指纹库加载失败";
    showError(`${error.message}。请刷新页面重试。`);
  }
}
initialize();
