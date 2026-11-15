(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SCORE_KEY = "provinciesprint.top10.v1";
  const screens = {
    intro: document.getElementById("intro-screen"),
    game: document.getElementById("game-screen"),
    intermission: document.getElementById("intermission-screen"),
    finish: document.getElementById("finish-screen")
  };
  const ui = {
    headerScore: document.getElementById("header-score"),
    roundLabel: document.getElementById("round-label"),
    timer: document.getElementById("timer"),
    roundKicker: document.getElementById("round-kicker"),
    prompt: document.getElementById("prompt"),
    promptPrefix: document.getElementById("prompt-prefix"),
    targetName: document.getElementById("target-name"),
    answerPrefix: document.getElementById("answer-prefix"),
    targetRepeat: document.getElementById("target-repeat"),
    answerPunctuation: document.getElementById("answer-punctuation"),
    progressCount: document.getElementById("progress-count"),
    progressBar: document.getElementById("progress-bar"),
    questionNumber: document.getElementById("question-number"),
    answerEyebrow: document.getElementById("answer-eyebrow"),
    roundHint: document.getElementById("round-hint"),
    feedback: document.getElementById("feedback"),
    map: document.getElementById("belgium-map"),
    capitalList: document.getElementById("capital-list"),
    provinceTime: document.getElementById("province-time"),
    totalTime: document.getElementById("total-time"),
    resultProvince: document.getElementById("result-province-time"),
    resultCapital: document.getElementById("result-capital-time"),
    resultTotal: document.getElementById("result-total-time"),
    qualifyPanel: document.getElementById("qualify-panel"),
    scoreForm: document.getElementById("score-form"),
    playerName: document.getElementById("player-name"),
    nameError: document.getElementById("name-error"),
    leaderboardList: document.getElementById("leaderboard-list"),
    emptyBoard: document.getElementById("empty-board")
  };

  let state;
  let animationFrame = 0;
  let highlightedProvince = null;

  function freshState() {
    return {
      round: "province",
      order: shuffle(PROVINCES),
      index: 0,
      startedAt: 0,
      provinceMs: 0,
      capitalMs: 0,
      totalMs: 0,
      completedIds: new Set(),
      completedCapitals: new Set(),
      selectedCapitalId: null,
      qualifies: false
    };
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, element]) => {
      element.hidden = key !== name;
    });
  }

  function formatTime(milliseconds) {
    const centiseconds = Math.floor(milliseconds / 10);
    const minutes = Math.floor(centiseconds / 6000);
    const seconds = Math.floor((centiseconds % 6000) / 100);
    const rest = centiseconds % 100;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(rest).padStart(2, "0")}`;
  }

  function startTimer() {
    cancelAnimationFrame(animationFrame);
    state.startedAt = performance.now();
    const update = (now) => {
      ui.timer.textContent = formatTime(now - state.startedAt);
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
  }

  function stopTimer() {
    const elapsed = Math.floor((performance.now() - state.startedAt) / 10) * 10;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    ui.timer.textContent = formatTime(elapsed);
    return elapsed;
  }

  function raiseProvince(path) {
    if (path.parentNode === ui.map && path !== ui.map.lastElementChild) ui.map.append(path);
  }

  function buildMap() {
    ui.map.replaceChildren();
    PROVINCES.forEach((province) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", province.path);
      path.setAttribute("class", "province");
      path.setAttribute("data-id", province.id);
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", "0");
      path.setAttribute("aria-label", province.name);
      path.addEventListener("pointerenter", () => raiseProvince(path));
      path.addEventListener("focus", () => raiseProvince(path));
      path.addEventListener("click", () => handleProvinceAction(province, path));
      path.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleProvinceAction(province, path);
        }
      });
      ui.map.append(path);
    });
  }

  function handleProvinceAction(province, path) {
    if (state.round === "province") {
      chooseProvince(province, path);
      return;
    }
    if (state.round === "capital" && state.selectedCapitalId) {
      const capital = PROVINCES.find((item) => item.id === state.selectedCapitalId);
      placeCapital(capital, path);
    }
  }

  function resetMapForRound(round) {
    ui.map.querySelectorAll(".province").forEach((path) => {
      path.classList.remove("is-correct", "is-wrong", "is-context", "is-drop-target");
      path.setAttribute("tabindex", "0");
      path.setAttribute("aria-disabled", "false");
      if (round === "capital") path.classList.add("is-context");
    });
  }

  function setFeedback(message, type = "") {
    ui.feedback.textContent = message;
    ui.feedback.className = `feedback${type ? ` ${type}` : ""}`;
  }

  function currentTarget() {
    return state.order[state.index];
  }

  function updateProvinceQuestion(feedbackMessage = "") {
    const target = currentTarget();
    const question = state.index + 1;
    ui.targetName.textContent = target.name;
    ui.targetRepeat.textContent = target.name;
    ui.progressCount.textContent = String(state.index);
    ui.progressBar.style.width = `${state.index * 10}%`;
    ui.questionNumber.textContent = String(question).padStart(2, "0");
    ui.prompt.setAttribute("aria-label", `Klik op ${target.name}`);
    setFeedback(feedbackMessage || "Zoek de provincie op de kaart.", feedbackMessage ? "success" : "");
  }

  function animateWrong(element) {
    element.classList.remove("is-wrong");
    void element.getBoundingClientRect();
    element.classList.add("is-wrong");
    setTimeout(() => element.classList.remove("is-wrong"), 520);
  }

  function chooseProvince(province, path) {
    if (state.round !== "province" || state.completedIds.has(province.id)) return;
    const target = currentTarget();
    if (province.id !== target.id) {
      animateWrong(path);
      setFeedback(`Dat is ${province.name}. Zoek ${target.name}.`, "error");
      return;
    }

    state.completedIds.add(province.id);
    path.classList.add("is-correct");
    raiseProvince(path);
    path.setAttribute("tabindex", "-1");
    path.setAttribute("aria-disabled", "true");
    advanceProvince(`Juist — ${province.name}! Zoek nu de volgende.`);
  }

  function advanceProvince(feedbackMessage) {
    state.index += 1;
    updateProgress();
    if (state.index < PROVINCES.length) {
      updateProvinceQuestion(feedbackMessage);
      return;
    }
    finishProvinceRound();
  }

  function updateProgress() {
    ui.progressCount.textContent = String(state.index);
    ui.progressBar.style.width = `${state.index * 10}%`;
    ui.questionNumber.textContent = String(Math.min(state.index + 1, 10)).padStart(2, "0");
  }

  function buildCapitalCards() {
    ui.capitalList.replaceChildren();
    shuffle(PROVINCES).forEach((province) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "city-card";
      button.dataset.provinceId = province.id;
      button.textContent = province.capital;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `${province.capital}. Sleep naar de juiste provincie of selecteer met Enter.`);
      button.addEventListener("pointerdown", (event) => startCityDrag(event, province, button));
      button.addEventListener("click", () => {
        if (button.dataset.suppressClick === "true") return;
        selectCapital(province, button);
      });
      ui.capitalList.append(button);
    });
  }

  function selectCapital(province, button) {
    if (button.disabled || state.round !== "capital") return;
    const alreadySelected = state.selectedCapitalId === province.id;
    ui.capitalList.querySelectorAll(".city-card").forEach((card) => card.setAttribute("aria-pressed", "false"));
    state.selectedCapitalId = alreadySelected ? null : province.id;
    if (state.selectedCapitalId) {
      button.setAttribute("aria-pressed", "true");
      setFeedback(`${province.capital} geselecteerd. Kies nu de juiste provincie op de kaart.`);
    } else {
      setFeedback("Selectie opgeheven. Kies of sleep een stad.");
    }
  }

  function startCityDrag(event, province, button) {
    if (button.disabled || event.button !== 0 || state.round !== "capital") return;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let latestX = startX;
    let latestY = startY;
    let moved = false;
    let scrollFrame = 0;
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.textContent = province.capital;
    ghost.hidden = true;
    document.body.append(ghost);
    try {
      button.setPointerCapture(pointerId);
    } catch (_error) {
      // Synthetic pointer events have no capturable browser pointer.
    }

    const autoScroll = () => {
      if (!moved) return;
      const edge = Math.min(90, window.innerHeight * 0.18);
      let distance = 0;
      if (latestY < edge) distance = -Math.ceil((edge - latestY) / 5);
      else if (latestY > window.innerHeight - edge) distance = Math.ceil((latestY - (window.innerHeight - edge)) / 5);
      if (distance) {
        window.scrollBy(0, distance);
        highlightProvinceAt(latestX, latestY);
      }
      scrollFrame = requestAnimationFrame(autoScroll);
    };

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 5 && !moved) return;
      latestX = moveEvent.clientX;
      latestY = moveEvent.clientY;
      if (!moved) scrollFrame = requestAnimationFrame(autoScroll);
      moved = true;
      moveEvent.preventDefault();
      ghost.hidden = false;
      ghost.style.left = `${latestX}px`;
      ghost.style.top = `${latestY}px`;
      button.classList.add("is-dragging");
      highlightProvinceAt(latestX, latestY);
    };

    const end = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      cancelAnimationFrame(scrollFrame);
      try {
        button.releasePointerCapture(pointerId);
      } catch (_error) {
        // The pointer may already have been released by the browser.
      }
      ghost.remove();
      button.classList.remove("is-dragging");
      clearDropHighlight();
      if (!moved || endEvent.type === "pointercancel") return;
      button.dataset.suppressClick = "true";
      setTimeout(() => delete button.dataset.suppressClick, 0);
      const path = provincePathAt(endEvent.clientX, endEvent.clientY);
      if (path) placeCapital(province, path, button);
      else setFeedback(`${province.capital} viel naast de kaart. Probeer opnieuw.`, "error");
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function provincePathAt(x, y) {
    const element = document.elementFromPoint(x, y);
    return element && element.closest ? element.closest(".province") : null;
  }

  function highlightProvinceAt(x, y) {
    const path = provincePathAt(x, y);
    if (path === highlightedProvince) return;
    clearDropHighlight();
    highlightedProvince = path;
    if (highlightedProvince && !highlightedProvince.classList.contains("is-correct")) {
      raiseProvince(highlightedProvince);
      highlightedProvince.classList.add("is-drop-target");
    }
  }

  function clearDropHighlight() {
    if (highlightedProvince) highlightedProvince.classList.remove("is-drop-target");
    highlightedProvince = null;
  }

  function placeCapital(capital, path, suppliedButton = null) {
    if (!capital || state.round !== "capital" || state.completedCapitals.has(capital.id)) return;
    const provinceId = path.dataset.id;
    const province = PROVINCES.find((item) => item.id === provinceId);
    const button = suppliedButton || ui.capitalList.querySelector(`[data-province-id="${capital.id}"]`);
    if (provinceId !== capital.id) {
      animateWrong(path);
      if (button) animateWrong(button);
      setFeedback(`${capital.capital} hoort niet in ${province.name}. Probeer opnieuw.`, "error");
      return;
    }

    state.completedCapitals.add(capital.id);
    state.selectedCapitalId = null;
    ui.capitalList.querySelectorAll(".city-card").forEach((card) => card.setAttribute("aria-pressed", "false"));
    state.index += 1;
    button.disabled = true;
    button.classList.add("is-complete");
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `${capital.capital} is juist geplaatst in ${capital.name}.`);
    path.classList.remove("is-context");
    path.classList.add("is-correct");
    raiseProvince(path);
    path.setAttribute("tabindex", "-1");
    path.setAttribute("aria-disabled", "true");
    updateProgress();
    if (state.index === PROVINCES.length) {
      finishGame();
      return;
    }
    setFeedback(`Juist — ${capital.capital} ligt in ${capital.name}. Nog ${PROVINCES.length - state.index} te gaan.`, "success");
  }

  function startProvinceRound() {
    state = freshState();
    buildMap();
    resetMapForRound("province");
    ui.headerScore.hidden = false;
    ui.roundLabel.textContent = "Ronde 1 van 2";
    ui.roundKicker.textContent = "Ronde 1 · Provincies";
    ui.promptPrefix.textContent = "Klik op";
    ui.targetName.hidden = false;
    ui.answerEyebrow.textContent = "Gevraagd";
    ui.answerPrefix.textContent = "Waar ligt";
    ui.targetRepeat.hidden = false;
    ui.answerPunctuation.hidden = false;
    ui.roundHint.textContent = "Klik de juiste vorm op de kaart. Een foute klik kost je alleen tijd.";
    ui.capitalList.hidden = true;
    showScreen("game");
    updateProvinceQuestion();
    startTimer();
  }

  function finishProvinceRound() {
    state.provinceMs = stopTimer();
    ui.provinceTime.textContent = formatTime(state.provinceMs);
    ui.headerScore.hidden = true;
    showScreen("intermission");
    document.getElementById("capital-start-button").focus();
  }

  function startCapitalRound() {
    state.round = "capital";
    state.index = 0;
    state.completedCapitals.clear();
    state.selectedCapitalId = null;
    resetMapForRound("capital");
    buildCapitalCards();
    ui.capitalList.hidden = false;
    ui.headerScore.hidden = false;
    ui.roundLabel.textContent = "Ronde 2 van 2";
    ui.roundKicker.textContent = "Ronde 2 · Hoofdsteden";
    ui.promptPrefix.textContent = "Sleep de hoofdsteden";
    ui.targetName.hidden = true;
    ui.answerEyebrow.textContent = "Sleep of selecteer";
    ui.answerPrefix.textContent = "Steden naar de kaart";
    ui.targetRepeat.hidden = true;
    ui.answerPunctuation.hidden = true;
    ui.roundHint.textContent = "Sleep elke stad naar haar provincie. Met het toetsenbord: selecteer een stad en daarna de provincie.";
    showScreen("game");
    updateProgress();
    setFeedback("De klok loopt. Sleep de eerste stad naar de kaart.");
    startTimer();
  }

  function loadScores() {
    try {
      const scores = JSON.parse(localStorage.getItem(SCORE_KEY) || "[]");
      if (!Array.isArray(scores)) return [];
      return scores
        .filter((score) => score && typeof score.name === "string" && Number.isFinite(score.totalMs) && score.totalMs >= 0)
        .sort((left, right) => left.totalMs - right.totalMs)
        .slice(0, 10);
    } catch (_error) {
      return [];
    }
  }

  function saveScores(scores) {
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify(scores.slice(0, 10)));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function isTopTen(totalMs, scores) {
    return scores.length < 10 || totalMs < scores[scores.length - 1].totalMs;
  }

  function renderLeaderboard(scores, newScoreId = "") {
    ui.leaderboardList.replaceChildren();
    ui.emptyBoard.hidden = scores.length > 0;
    scores.forEach((score) => {
      const item = document.createElement("li");
      if (score.id === newScoreId) item.classList.add("is-new");
      const name = document.createElement("span");
      name.className = "score-name";
      name.textContent = score.name;
      const time = document.createElement("time");
      time.textContent = formatTime(score.totalMs);
      item.append(name, time);
      ui.leaderboardList.append(item);
    });
  }

  function finishGame() {
    state.capitalMs = stopTimer();
    state.totalMs = state.provinceMs + state.capitalMs;
    const provinceText = formatTime(state.provinceMs);
    const capitalText = formatTime(state.capitalMs);
    const totalText = formatTime(state.totalMs);
    const scores = loadScores();
    state.qualifies = isTopTen(state.totalMs, scores);
    ui.headerScore.hidden = true;
    ui.totalTime.textContent = totalText;
    ui.resultProvince.textContent = provinceText;
    ui.resultCapital.textContent = capitalText;
    ui.resultTotal.textContent = totalText;
    ui.scoreForm.reset();
    ui.nameError.textContent = "";
    ui.qualifyPanel.hidden = !state.qualifies;
    renderLeaderboard(scores);
    showScreen("finish");
    if (state.qualifies) ui.playerName.focus();
    else document.getElementById("restart-button").focus();
  }

  function submitScore(event) {
    event.preventDefault();
    if (!state || !state.qualifies) return;
    const name = ui.playerName.value.trim().slice(0, 24);
    if (!name) {
      ui.nameError.textContent = "Vul je naam in om de score te bewaren.";
      ui.playerName.focus();
      return;
    }
    const score = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      totalMs: state.totalMs,
      provinceMs: state.provinceMs,
      capitalMs: state.capitalMs
    };
    const scores = [...loadScores(), score].sort((left, right) => left.totalMs - right.totalMs).slice(0, 10);
    if (!saveScores(scores)) {
      ui.nameError.textContent = "De browser kon deze score niet lokaal bewaren.";
      return;
    }
    state.qualifies = false;
    ui.qualifyPanel.hidden = true;
    renderLeaderboard(scores, score.id);
    document.getElementById("restart-button").focus();
  }

  document.getElementById("start-button").addEventListener("click", startProvinceRound);
  document.getElementById("capital-start-button").addEventListener("click", startCapitalRound);
  document.getElementById("restart-button").addEventListener("click", startProvinceRound);
  ui.scoreForm.addEventListener("submit", submitScore);
})();
