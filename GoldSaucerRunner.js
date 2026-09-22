const useChocoholic = saru.SetConfig("useChocoholic", "Chocobo Racing instead of Cuff-a-cur", saru.configType.checkbox, false);
const noChocoholicQueueMinutes = saru.SetConfig("noChocoholicQueueMinutes", "No Chocoholic Queue [X] Minutes before Gate", saru.configType.number, [1, 10], 5);

const CONFIG = {
  cuff: { x: 24.9306, y: -5.0, z: -48.7132 }, hunga: { x: 66.96, y: -4.48, z: -24.69 },
  rabbits: [{ x: 42.6145, y: -5.0, z: -16.1596 }, { x: -11.5351, y: 3.2575, z: -73.0550 }, { x: 21.2236, y: 3.9997, z: 38.3259 }],
  rabbitIds: [1011080, 1011084, 1011093], eventIds: [1016306, 1031796, 1010476],
  yojinbo: [
    { weight: 50, coords: { x: 70.5696, y: -4.4987, z: -35.9556 } }, { weight: 50, coords: { x: 70.6, y: -4.4985, z: -36.0163 } }, { weight: 50, coords: { x: 70.647, y: -4.4985, z: -35.8764 } }, { weight: 50, coords: { x: 70.4331, y: -4.4984, z: -35.9865 } }, { weight: 20, coords: { x: 74.2948, y: -4.4898, z: -32.7098 } },
    { weight: 5, coords: { x: 71.8393, y: -4.4904, z: -40.3642 } }, { weight: 5, coords: { x: 65.4584, y: -4.4889, z: -34.0743 } }, { weight: 5, coords: { x: 71.3808, y: -4.4818, z: -26.6386 } }, { weight: 5, coords: { x: 71.5562, y: -4.4906, z: -31.6023 } }, { weight: 5, coords: { x: 69.1502, y: -4.4809, z: -45.6681 } },
    { weight: 5, coords: { x: 76.0904, y: -4.4847, z: -41.3535 } }, { weight: 5, coords: { x: 77.9668, y: -4.4851, z: -37.2426 } }, { weight: 5, coords: { x: 76.0089, y: -4.4876, z: -33.0938 } }, { weight: 5, coords: { x: 74.2102, y: -4.4845, z: -28.9313 } }, { weight: 5, coords: { x: 71.5715, y: -4.4797, z: -25.5073 } },
    { weight: 5, coords: { x: 68.2456, y: -4.481, z: -26.4386 } }, { weight: 3, coords: { x: 65.5908, y: -4.4837, z: -29.2618 } }, { weight: 3, coords: { x: 67.2651, y: -4.4899, z: -32.4184 } }, { weight: 3, coords: { x: 69.3649, y: -4.4951, z: -34.3932 } }, { weight: 3, coords: { x: 67.687, y: -4.4932, z: -36.8502 } },
    { weight: 3, coords: { x: 65.2354, y: -4.4878, z: -38.7922 } }, { weight: 2, coords: { x: 62.8826, y: -4.4845, z: -37.6553 } }, { weight: 2, coords: { x: 62.0965, y: -4.4832, z: -34.744 } }, { weight: 2, coords: { x: 63.8944, y: -4.4852, z: -32.498 } }, { weight: 2, coords: { x: 67.2915, y: -4.4863, z: -29.9108 } },
    { weight: 2, coords: { x: 70.5612, y: -4.4876, z: -29.8105 } }, { weight: 1, coords: { x: 74.1418, y: -4.4881, z: -31.2764 } }, { weight: 1, coords: { x: 75.1235, y: -4.4901, z: -34.6053 } }, { weight: 1, coords: { x: 74.2413, y: -4.4906, z: -38.4611 } }, { weight: 1, coords: { x: 75.9124, y: -4.4847, z: -41.4163 } },
    { weight: 1, coords: { x: 76.4199, y: -4.4803, z: -44.3407 } }, { weight: 1, coords: { x: 73.6213, y: -4.4818, z: -44.7664 } }
  ]
};

function formatClock(timestamp) {
  let seconds = (timestamp % 86400 + 7200) % 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
}

function isMgpPayout(message) {
  return /^Du hast [\d.,]+ MGP erhalten\.$/.test(message) || /^You obtain [\d.,]+ MGP\.$/.test(message);
}

class Movement {
  constructor() { this.current = null; }
  go(tag, position, buffer, done) {
    this.current = { tag, position, buffer, done };
    if (vNavMesh.MoveTo(position, buffer)) {
      if (tag !== "cuff") console.log("[Saru] Moving to " + tag + ".");
      return true;
    }
    this.current = null;
    console.error("[Saru] Move failed: " + tag);
    return false;
  }
  cancel(tag) {
    if (this.current && (!tag || this.current.tag === tag)) this.current = null;
  }
  arrived() {
    if (!this.current || dist(curPos, this.current.position) > this.current.buffer + 0.1) return;
    const move = this.current;
    this.current = null;
    if (move.tag !== "cuff") console.log("[Saru] Arrived at " + move.tag + ".");
    move.done();
  }
}

class Scheduler {
  constructor() { this.watchAt = null; this.eventAt = null; this.announcedAt = null; }
  nextEvent() {
    const now = time.getTime();
    const day = Math.floor(now / 86400) * 86400;
    return day + (Math.floor((now - day - 10) / 1200) + 1) * 1200 + 10;
  }
  secondsUntilEvent() { return this.nextEvent() - time.getTime(); }
  arm() {
    this.cancel();
    this.eventAt = this.nextEvent();
    this.watchAt = this.eventAt - 60;
    Timer.At(this.watchAt);
    if (this.announcedAt !== this.eventAt) {
      this.announcedAt = this.eventAt;
      console.log("[Saru] Next GATE: " + formatClock(this.eventAt) + ".");
    }
  }
  cancel() {
    if (this.watchAt !== null) Timer.Un(this.watchAt);
    this.watchAt = null;
    this.eventAt = null;
  }
  triggered() { this.watchAt = null; }
}

class CuffACur {
  constructor(movement) { this.movement = movement; this.active = false; this.retryTimer = null; this.finishTimer = null; }
  start() {
    this.active = false;
    clearTimeout(this.retryTimer);
    clearTimeout(this.finishTimer);
    this.movement.cancel("cuff");
    this.active = true;
    Saucy.cuffacur.fmc.Toggle(false);
    this.moveOrEnable();
  }
  moveOrEnable() {
    if (!this.active) return;
    if (dist(curPos, CONFIG.cuff) <= 2) return this.enable();
    if (!this.movement.current) this.movement.go("cuff", CONFIG.cuff, 0.35, () => this.enable());
    else if (!vNavMesh.IsRunning()) {
      this.movement.cancel("cuff");
      this.movement.go("cuff", CONFIG.cuff, 0.35, () => this.enable());
    }
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.moveOrEnable(), 4000);
  }
  enable() {
    if (!this.active) return;
    clearTimeout(this.retryTimer);
    this.movement.cancel("cuff");
    Saucy.cuffacur.Toggle(true);
    console.log("[Saru] Arrived at Cuff-a-Cur. Starting a round.");
  }
  stop(done) {
    this.active = false;
    clearTimeout(this.retryTimer);
    clearTimeout(this.finishTimer);
    this.movement.cancel("cuff");
    Saucy.cuffacur.fmc.Set(1);
    Saucy.cuffacur.fmc.Toggle(true);
    if (!done) return;
    console.log("[Saru] Finishing the current Cuff-a-Cur round before the GATE.");
    const wait = () => {
      if (!Saucy.cuffacur.hasRunState()) {
        console.log("[Saru] Cuff-a-Cur state is unavailable. Continuing after a short pause.");
        return this.finishTimer = setTimeout(done, 1000);
      }
      if (!Saucy.cuffacur.isRunning()) return done();
      this.finishTimer = setTimeout(wait, 250);
    };
    wait();
  }
}

class ChocoholicRacing {
  constructor(scheduler) {
    this.scheduler = scheduler;
    this.enabled = false;
    this.resumeTimer = null;
    this.notBefore = 0;
    this.transitionPending = false;
    this.finishAfterPayout = null;
  }
  get deadzoneSeconds() { return Number(noChocoholicQueueMinutes) * 60; }
  clearTimers() {
    clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
  }
  setEnabled(value) {
    if (this.enabled === value) return;
    if (value) chocoholic.SetNumberOfRaces(1);
    const changed = chocoholic.Toggle(value);
    this.enabled = value && changed;
    if (changed) console.log("[Saru] Chocoholic " + (value ? "enabled." : "disabled."));
  }
  start() { this.evaluate(); }
  stop() {
    this.clearTimers();
    this.notBefore = 0;
    this.transitionPending = false;
    this.finishAfterPayout = null;
    this.setEnabled(false);
  }
  pauseForGate() {
    // A race already in progress must finish. Its MGP payout is the only
    // normal GATE-flow signal that turns Chocoholic off.
    clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
  }
  resumeAfter(delayMs, reason) {
    this.notBefore = Math.max(this.notBefore, Date.now() + delayMs);
    clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      console.log("[Saru] " + reason + " Rechecking Chocoholic queue.");
      this.evaluate();
    }, this.notBefore - Date.now());
  }
  evaluate() {
    if (Date.now() < this.notBefore) return this.resumeAfter(this.notBefore - Date.now(), "Chocoholic cooldown still active.");
    const seconds = this.scheduler.secondsUntilEvent();
    if (seconds <= this.deadzoneSeconds) {
      console.log("[Saru] Next GATE is within " + noChocoholicQueueMinutes + " minutes. Chocoholic will not queue another race after the current one.");
      return;
    }
    this.setEnabled(true);
  }
  onMgpPayout(message) {
    if (!isMgpPayout(message)) return;
    this.setEnabled(false);
    if (this.finishAfterPayout) {
      const done = this.finishAfterPayout;
      this.finishAfterPayout = null;
      return done();
    }
    this.resumeAfter(20000, "Race MGP payout detected.");
  }
  finishForGate(done) {
    if (!this.enabled) return done();
    this.finishAfterPayout = done;
    console.log("[Saru] Waiting for the current Chocoholic race payout before heading to the GATE.");
  }
  onMapChange(canQueue) {
    // The map changes during a transition; never keep racing enabled through it.
    this.setEnabled(false);
    this.transitionPending = canQueue && FFXIV.inZoneChange;
    if (canQueue && !this.transitionPending) this.recheckAfterTransition();
  }
  onZoneChanged(canQueue) {
    if (!this.transitionPending) return;
    this.transitionPending = false;
    if (canQueue) this.recheckAfterTransition();
  }
  recheckAfterTransition() {
    const remainingCooldown = this.notBefore - Date.now();
    if (remainingCooldown > 0) return this.resumeAfter(remainingCooldown, "Chocoholic cooldown still active.");
    console.log("[Saru] Map transition finished. Checking Chocoholic queue now.");
    this.evaluate();
  }
}

class BetweenGatesActivity {
  constructor(movement, scheduler) {
    this.cuff = new CuffACur(movement);
    this.chocoholic = new ChocoholicRacing(scheduler);
  }
  get usesChocoholic() { return useChocoholic; }
  start(secondsUntilGate) {
    if (this.usesChocoholic) {
      this.cuff.stop();
      this.chocoholic.start();
    } else if (secondsUntilGate > 120) {
      this.cuff.start();
    }
  }
  pauseForGate() {
    if (this.usesChocoholic) this.chocoholic.pauseForGate();
  }
  stopForGate(done) {
    if (this.usesChocoholic) {
      return this.chocoholic.finishForGate(done);
    }
    this.cuff.stop(done);
  }
  resumeAfterGate(delayMs, reason) {
    if (this.usesChocoholic) this.chocoholic.resumeAfter(delayMs, reason);
    else this.cuff.start();
  }
  onMessage(message, canQueue) {
    if (this.usesChocoholic && (canQueue || this.chocoholic.finishAfterPayout)) this.chocoholic.onMgpPayout(message);
  }
  onMapChange(canQueue) {
    if (this.usesChocoholic) this.chocoholic.onMapChange(canQueue);
  }
  onZoneChanged(canQueue) {
    if (this.usesChocoholic) this.chocoholic.onZoneChanged(canQueue);
  }
  stop() {
    this.chocoholic.stop();
    this.cuff.stop();
  }
}

class Activator {
  constructor(ids) { this.ids = ids; this.timer = null; this.token = 0; }
  nearest(radius) {
    let result = null;
    let nearest = Infinity;
    for (const id of this.ids) {
      const distance = dist(id);
      if (distance < radius && distance < nearest) { result = id; nearest = distance; }
    }
    return result;
  }
  cancel() {
    this.token++;
    clearTimeout(this.timer);
    this.timer = null;
  }
  activate(radius, attempts, done, failed) {
    this.cancel();
    const token = this.token;
    const tryActivate = attempt => {
      if (token !== this.token) return;
      const id = this.nearest(radius);
      if (id !== null && target.Activate(id)) {
        return done();
      }
      if (attempt >= attempts) {
        console.error("[Saru] Could not activate the object in time.");
        return failed();
      }
      this.timer = setTimeout(() => tryActivate(attempt + 1), 500);
    };
    tryActivate(0);
  }
}

class Rabbit {
  constructor(movement) { this.movement = movement; this.activator = new Activator(CONFIG.rabbitIds); }
  start(done, failed) {
    const position = CONFIG.rabbits.reduce((best, current) => dist(curPos, current) < dist(curPos, best) ? current : best);
    console.log("[Saru] Event NPC is not nearby. Moving to closest Rabbit.");
    if (!this.movement.go("rabbit", position, 0.35, () => this.activator.activate(5, 12, done, failed))) failed();
  }
  cancel() {
    this.movement.cancel("rabbit");
    this.activator.cancel();
  }
}

class Yojinbo {
  constructor(movement) { this.movement = movement; this.active = false; this.restoreTimer = null; }
  begin() {
    this.active = true;
    Saucy.sliceisright.automove.Toggle(false);
    console.log("[Saru] The Slice Is Right detected. Disabled Saucy Slice-is-Right automove.");
  }
  onMessage(message) {
    if (!this.active || !(!message.includes("Fortune favors the bold, and if you are truly worthy, your luck will hold!") && message.includes("und nichts ist mehr, wie es war!"))) return;
    let roll = Math.random() * CONFIG.yojinbo.reduce((sum, point) => sum + point.weight, 0);
    let selected = CONFIG.yojinbo[0];
    for (const point of CONFIG.yojinbo) {
      roll -= point.weight;
      if (roll < 0) { selected = point; break; }
    }
    console.log("[Saru] The Slice Is Right gamble detected. Moving to weighted random position.");
    this.movement.go("yojinbo", selected.coords, 0.35, () => {});
  }
  entered() {
    clearTimeout(this.restoreTimer);
    this.restoreTimer = setTimeout(() => {
      if (!this.active) return;
      Saucy.sliceisright.automove.Toggle(true);
      sendMsg("/vbm ai on");
      sendMsg("/bmrai on");
    }, 2000);
  }
  reset() {
    this.active = false;
    clearTimeout(this.restoreTimer);
    this.movement.cancel("yojinbo");
    Saucy.sliceisright.automove.Toggle(true);
  }
}

class Hunga {
  constructor(movement) { this.movement = movement; this.active = false; this.timer = null; }
  begin() { this.active = true; }
  entered() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.active) this.movement.go("hunga", CONFIG.hunga, 0.25, () => {});
    }, 12000);
  }
  reset() {
    this.active = false;
    clearTimeout(this.timer);
    this.movement.cancel("hunga");
  }
}

class Controller {
  constructor() {
    this.movement = new Movement();
    this.scheduler = new Scheduler();
    this.activity = new BetweenGatesActivity(this.movement, this.scheduler);
    this.rabbit = new Rabbit(this.movement);
    this.eventNpc = new Activator(CONFIG.eventIds);
    this.yojinbo = new Yojinbo(this.movement);
    this.hunga = new Hunga(this.movement);
    this.state = "waiting";
    this.gate = null;
    this.watching = false;
    this.watchTimer = null;
    this.zoneTimer = null;
    this.payoutWaiting = false;
    this.payoutArmTimer = null;
    this.payoutTimeout = null;
    this.cuffTimer = null;
    this.eventCloseTimer = null;
    this.joinTimer = null;
    this.joinAttempts = 0;
  }
  start() {
    const seconds = this.scheduler.secondsUntilEvent();
    this.scheduler.arm();
    if (useChocoholic) {
      console.log("[Saru] Chocoholic mode selected.");
      this.activity.start(seconds);
    } else if (seconds > 120) {
      console.log("[Saru] Enough time before the next GATE. Starting Cuff-a-Cur.");
      this.activity.start(seconds);
    } else {
      console.log("[Saru] Next GATE is within two minutes. Waiting for announcement.");
    }
  }
  stop() {
    this.clearTimers();
    this.scheduler.cancel();
    this.rabbit.cancel();
    this.eventNpc.cancel();
    this.yojinbo.reset();
    this.hunga.reset();
    this.activity.stop();
    return true;
  }
  clearTimers() {
    clearTimeout(this.watchTimer);
    clearTimeout(this.zoneTimer);
    clearTimeout(this.payoutArmTimer);
    clearTimeout(this.payoutTimeout);
    clearTimeout(this.cuffTimer);
    clearTimeout(this.eventCloseTimer);
    clearTimeout(this.joinTimer);
    this.watchTimer = this.zoneTimer = this.payoutArmTimer = this.payoutTimeout = this.cuffTimer = this.eventCloseTimer = this.joinTimer = null;
    this.watching = this.payoutWaiting = false;
  }
  onTime() {
    this.scheduler.triggered();
    if (this.state !== "waiting") return this.scheduler.arm();
    this.activity.pauseForGate();
    this.watching = true;
    console.log("[Saru] Announcement window opened. Waiting two minutes for a supported GATE.");
    this.watchTimer = setTimeout(() => {
      if (!this.watching) return;
      this.watching = false;
      this.scheduler.arm();
      if (useChocoholic) {
        console.log("[Saru] No supported GATE announced. Rechecking Chocoholic in 20 seconds.");
        this.activity.resumeAfterGate(20000, "Announcement window finished.");
      } else {
        console.log("[Saru] No supported GATE announced during the two-minute window. Starting Cuff-a-Cur.");
        this.activity.resumeAfterGate(0, "Announcement window finished.");
      }
    }, 120000);
  }
  onMessage(message) {
    this.activity.onMessage(message, this.state === "waiting");
    this.yojinbo.onMessage(message);
    if (this.payoutWaiting && isMgpPayout(message)) return this.onPayout(message);

    if (
      !this.watching || (
        (
          !message.includes("GATE") &&
          !message.includes("limited-time event")
        ) || (
          !message.includes("begonnen") &&
          !message.includes("underway")
        )
      )
    ) return;

    const gate = (
      message.includes("Air Force One") ||
      message.includes("Luftwaffe")
    ) ? "Airforce" : (
      message.includes("Yojinbo") ||
      message.includes("The Slice Is Right")
    ) ? "SliceIsRight" : (
      message.includes("Hungaaa")
    ) ? "Hunga" : null;

    if (!gate) return;
    this.watching = false;
    clearTimeout(this.watchTimer);
    this.gate = gate;
    console.log("[Saru] Supported GATE announcement detected: " + gate + ".");
    this.travel();
  }
  travel() {
    this.state = "preparing-gate";
    this.activity.stopForGate(() => this.beginTravel());
  }
  beginTravel() {
    if (this.state !== "preparing-gate") return;
    this.state = "travelling";
    console.log("[Saru] Between-GATE activity stopped. Heading to the GATE.");
    if (this.gate === "SliceIsRight") this.yojinbo.begin();
    if (this.gate === "Hunga") this.hunga.begin();
    if (this.eventNpc.nearest(10) !== null) {
      console.log("[Saru] Event NPC is already nearby. Entering directly.");
      return this.activateEventNpc();
    }
    this.rabbit.start(() => this.waitForZoneTransition(), () => this.returnToActivity("Rabbit activation failed."));
  }
  waitForZoneTransition() {
    this.state = "transition";
    this.transitionSeen = FFXIV.inZoneChange;
    console.log("[Saru] Activated rabbit. Waiting for transition before the event NPC.");
    this.zoneTimer = setTimeout(() => {
      if (this.state === "transition") {
        console.log("[Saru] No transition detected. Checking the event NPC now.");
        this.activateEventNpc();
      }
    }, 8000);
  }
  onZoneChangeStart() {
    if (this.state === "transition") this.transitionSeen = true;
    if (this.state === "airforce-result") {
      this.state = "airforce-return";
      console.log("[Saru] Returning from Airforce.");
    }
  }
  onZoneChanged() {
    if (this.state === "transition" && this.transitionSeen) {
      clearTimeout(this.zoneTimer);
      console.log("[Saru] Transition finished. Waiting one second before activating the event NPC.");
      this.zoneTimer = setTimeout(() => this.activateEventNpc(), 1000);
    }
    if (this.state === "airforce-return") this.returnToActivity("Back from Airforce.");
    this.activity.onZoneChanged(this.state === "waiting");
  }
  onEventDone() {
    if (this.gate !== "Airforce" || this.state !== "gate") return;
    this.state = "airforce-result";
    this.payoutWaiting = false;
    clearTimeout(this.payoutArmTimer);
    clearTimeout(this.payoutTimeout);
    clearTimeout(this.cuffTimer);
    this.payoutArmTimer = this.payoutTimeout = this.cuffTimer = null;
    console.log("[Saru] Airforce finished. Closing the result in 2 seconds.");
    this.eventCloseTimer = setTimeout(() => {
      if (this.state !== "airforce-result") return;
      FFXIV.closeRideShootingResult();
    }, 2000);
  }
  activateEventNpc() {
    this.state = "joining";
    this.joinAttempts = 0;
    this.tryEventNpcJoin();
  }
  tryEventNpcJoin() {
    if (this.state !== "joining") return;
    if (FFXIV.selectYesnoOpen) return this.confirmEventJoin();
    const id = this.eventNpc.nearest(10);
    if (id !== null) target.Activate(id);
    this.joinAttempts++;
    if (this.joinAttempts === 1) console.log("[Saru] Activating event NPC and waiting for confirmation.");
    this.joinTimer = setTimeout(() => {
      if (this.state !== "joining") return;
      if (FFXIV.selectYesnoOpen) return this.confirmEventJoin();
      if (this.joinAttempts >= 10) return this.returnToActivity("Event join confirmation did not appear.");
      console.log("[Saru] No event confirmation yet. Trying again.");
      this.tryEventNpcJoin();
    }, 2000);
  }
  onDialog() {
    if (this.state !== "joining") return true;
    this.confirmEventJoin();
  }
  confirmEventJoin() {
    if (this.state !== "joining") return;
    clearTimeout(this.joinTimer);
    this.joinTimer = null;
    console.log("[Saru] Event confirmation detected. Joining now.");
    FFXIV.answerYes();
    setTimeout(() => this.entered(), 500);
  }
  entered() {
    this.state = "gate";
    this.rabbit.cancel();
    this.eventNpc.cancel();
    this.scheduler.arm();
    console.log("[Saru] Event NPC activated; arming payout detection in 3 seconds.");
    if (this.gate === "SliceIsRight") this.yojinbo.entered();
    if (this.gate === "Hunga") {
      console.log("[Saru] Hunga detected. Walking to Hunga position in 12 seconds.");
      this.hunga.entered();
    }
    this.payoutArmTimer = setTimeout(() => {
      this.payoutWaiting = true;
      console.log("[Saru] Waiting for MGP payout.");
    }, 3000);
    this.payoutTimeout = setTimeout(() => this.returnToActivity("No payout detected within 13 minutes."), 13 * 60 * 1000);
  }
  onPayout(message) {
    this.payoutWaiting = false;
    clearTimeout(this.payoutArmTimer);
    clearTimeout(this.payoutTimeout);
    this.payoutArmTimer = this.payoutTimeout = null;
    const delay = useChocoholic ? 20000 : 4000;
    console.log("[Saru] Payout detected: " + message + ". Resuming " + (useChocoholic ? "Chocoholic" : "Cuff-a-Cur") + " in " + (delay / 1000) + " seconds.");
    clearTimeout(this.cuffTimer);
    this.cuffTimer = setTimeout(() => this.returnToActivity("Payout delay finished."), delay);
  }
  returnToActivity(reason) {
    clearTimeout(this.zoneTimer);
    this.zoneTimer = null;
    clearTimeout(this.payoutArmTimer);
    clearTimeout(this.payoutTimeout);
    clearTimeout(this.cuffTimer);
    clearTimeout(this.eventCloseTimer);
    clearTimeout(this.joinTimer);
    this.payoutArmTimer = this.payoutTimeout = this.cuffTimer = this.eventCloseTimer = this.joinTimer = null;
    this.payoutWaiting = false;
    this.rabbit.cancel();
    this.eventNpc.cancel();
    this.yojinbo.reset();
    this.hunga.reset();
    this.state = "waiting";
    this.gate = null;
    if (this.scheduler.watchAt === null) this.scheduler.arm();
    console.log("[Saru] " + reason + " Resuming " + (useChocoholic ? "Chocoholic" : "Cuff-a-Cur") + ".");
    this.activity.start(this.scheduler.secondsUntilEvent());
  }

  onMapChange() {
    this.activity.onMapChange(this.state === "waiting");
  }
}

const Saru = new Controller();
function Start() {
  Saru.start();
}
function Stop() { return Saru.stop(); }
addEventListener(FFEV.message, message => Saru.onMessage(message));
addEventListener(FFEV.time, () => Saru.onTime());
addEventListener(FFEV.arrived, () => Saru.movement.arrived());
addEventListener(FFEV.dialog, () => Saru.onDialog());
addEventListener(FFEV.onZoneChangeStart, () => Saru.onZoneChangeStart());
addEventListener(FFEV.onZoneChanged, () => Saru.onZoneChanged());
addEventListener(FFEV.onEventDone, () => Saru.onEventDone());
addEventListener(FFEV.onMapChange, () => Saru.onMapChange());
