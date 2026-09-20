# Saru Script Documentation

## Overview

Saru runs JavaScript files from its local `Scripts` directory. Each local file is shown in Saru’s **Scripts** tab, where it can be started and stopped independently. Multiple scripts can run at the same time.

The **Load scripts** tab lists versioned scripts from the SaruScripts repository. Remote scripts are downloaded only after an explicit install action. Saru does not automatically update installed scripts.

## Script files

Every script has a unique filename and must use the `.js` extension. The filename without `.js` is the script name shown in Saru.

```text
Scripts/
  GoldSaucerRunner.js
  MyScript.js
```

Double-click a local script name in the **Scripts** tab to rename it. Names cannot contain whitespace and must be unique. Renaming also changes the local filename.

## Starting and stopping scripts

Use the buttons in Saru or these commands:

```text
/saru start <scriptname>
/saru stop
```

`/saru stop` stops every running Saru script. A script can also call `Exit()` to stop itself.

## Remote script catalog

The repository catalog pairs a JavaScript file with a Markdown file that has the same base name.

```text
GoldSaucerRunner.js
GoldSaucerRunner.md
```

The JavaScript file is installed locally. The Markdown file is used as the description in the **Load scripts** tab.

Each remote script has a version list. Versions are ordered newest first and use the timestamp format `MM/DD/YYYY HH:mm`. Select the desired version before installing. Installing a different version overwrites the existing local file with the same script name.

Saru remembers the installed commit and timestamp. If an installed remote script file is deleted locally, Saru restores the exact remembered version on the next plugin load. This restore behavior does not update the script to a newer repository version.

## Basic script structure

Saru uses the Jint JavaScript runtime. A minimal script can be empty except for optional lifecycle functions.

```js
function Start() {}

function Stop() {
  return true;
}
```

`Start()` runs once after the script has been loaded.

`Stop()` runs when Saru stops the script. Return `true` to complete the stop cleanly. A stop that returns another value or does not complete in time is terminated.

## Event listeners

Register a callback with `addEventListener(eventName, callback)`.

```js
function OnMessage(message) {
  console.log(message);
}

addEventListener("message", OnMessage);
```

Use the constants in `FFEV` when possible.

| Event | Constant | Callback | When it fires |
| --- | --- | --- | --- |
| `message` | `FFEV.message` | `(message) => {}` | A chat message is received. |
| `dialog` | `FFEV.dialog` | `() => true/false` | A `SelectYesno` dialog opens. `true` selects Yes and `false` selects No. |
| `arrived` | `FFEV.arrived` | `() => {}` | The player reaches a position requested through `vNavMesh.MoveTo`. |
| `time` | `FFEV.time` | `() => {}` | A timestamp registered through `Timer.At` is reached. |
| `reach` | `FFEV.reach` | `() => {}` | A watched targetable object enters the requested radius. |
| `zoneChangeStart` | `FFEV.onZoneChangeStart` | `() => {}` | A zone transition starts. |
| `zoneChanged` | `FFEV.onZoneChanged` | `() => {}` | A zone transition ends. |
| `dutyEnd` | `FFEV.onDutyEnd` | `() => {}` | The player leaves a duty. |
| `eventDone` | `FFEV.onEventDone` | `() => {}` | The Ride Shooting result dialog is created. |

Example:

```js
addEventListener(FFEV.onZoneChanged, () => {
  console.info("Zone transition completed.");
});
```

## Positions and distance

A position is an object with `x`, `y`, and `z` values.

```js
const destination = { x: 12.5, y: 3.0, z: -42.75 };
```

`curPos` is a read-only snapshot of the player position.

```js
console.log(curPos.x);
console.log(curPos.y);
console.log(curPos.z);
```

`dist(a, b)` returns the three-dimensional distance between two positions.

```js
const distance = dist(curPos, destination);
```

`dist(baseId)` returns the distance to the nearest targetable object with that base ID. It returns `NaN` when no matching targetable object is present.

```js
if (dist(12345) < 3) {
  console.info("The object is nearby.");
}
```

## Game state

`FFXIV` is a read-only game state snapshot. It exposes:

```text
currentMap
territoryId
instance
inZoneChange
waitForDuty
boundByDuty
occupiedInQuestEvent
inDutyQueue
inCombat
mounted
jumping
isLoggedIn
isPvP
selectYesnoOpen
rideShootingResultOpen
```

`inZoneChange` is also available as a standalone read-only global.

```js
if (FFXIV.inZoneChange || FFXIV.waitForDuty) {
  return;
}
```

## Time and scheduled callbacks

`time.getTime()` returns the current Unix timestamp in seconds.

```js
const now = time.getTime();
```

Use `Timer.At(timestamp)` to trigger the `time` event once at a Unix timestamp.

```js
Timer.At(time.getTime() + 60);
Timer.Un(time.getTime() + 60);
Timer.UnI(0);
```

JavaScript-style timers are also available. Their delay values are milliseconds.

```js
const once = setTimeout(() => console.info("Done."), 1000);
const repeated = setInterval(() => console.info("Tick."), 5000);

clearTimeout(once);
clearInterval(repeated);
```

## Targets and interaction

Use the `target` API with an object base ID.

```js
target.Select(12345);
target.Activate(12345);
target.Activate();
```

`target.Select(baseId)` selects a matching targetable object.

`target.Activate(baseId)` selects and interacts with a matching targetable object.

`target.Activate()` interacts with the current target.

Before an activation, Saru explicitly enables normal camera collision through Cammy when Cammy is loaded. This uses Cammy’s public loaded API. Scripts do not need to handle this separately.

Use `target.At(baseId, radius)` to wait for a targetable object within a radius. It triggers the `reach` event once.

```js
target.At(12345, 4);
target.Un(12345);
```

## Movement with vNavMesh

`vNavMesh` must be loaded for movement.

```js
vNavMesh.MoveTo(12.5, 3.0, -42.75, 1.5);
vNavMesh.MoveTo({ x: 12.5, y: 3.0, z: -42.75 }, 1.5);
```

The final argument is the arrival buffer. The `arrived` event fires after the player reaches the buffer.

```js
if (!vNavMesh.IsRunning()) {
  vNavMesh.MoveTo(destination, 1.5);
}
```

Movement is shared by the game client. Scripts that issue movement requests concurrently can replace each other’s active movement path.

## Dialog controls

Use `WaitForDialog` to answer a visible `SelectYesno` dialog.

```js
WaitForDialog.Select(true);
WaitForDialog.Select(false);
WaitForDialog.Y();
WaitForDialog.N();
```

Returning a boolean from a `dialog` event listener also answers the dialog.

```js
addEventListener(FFEV.dialog, () => true);
```

Use `FFXIV.closeRideShootingResult()` to queue the close action for the visible Ride Shooting result dialog.

## Chat and logging

`sendMsg(text)` sends text through the game chat box. Include a slash in the string when sending a command.

```js
sendMsg("/say Hello");
sendMsg("Hello without a command.");
```

Console functions:

```js
console.info("Information.");
console.log("Visible local echo.");
console.error("Error.");
```

`console.log` also creates a local Echo message. Avoid using it in very frequent callbacks.

## Saucy integration

The `Saucy` global is available when Saucy is loaded. Saru can still run scripts that do not use Saucy when Saucy is unavailable.

### Triple Triad sources

`Saucy.npcs` and `CardSourceNPCs.All` expose Saucy’s current Triple Triad NPC source list.

```js
for (const npc of Saucy.npcs) {
  console.info(npc.Name);
  console.info(npc.location);

  for (const card of npc.cards) {
    if (!card.obtained()) {
      console.info(card.Name);
    }
  }
}
```

Cards can be searched by English or German name.

```js
const card = Saucy.cards["Kobalos"];

if (card !== null) {
  console.info(card.npc);
  console.info(card.npcs);
}
```

### Cuff-a-Cur and Out on a Limb

```js
Saucy.cuffacur.Toggle(true);
Saucy.outonalimb.Toggle(false);

Saucy.cuffacur.fmc.Toggle(true);
Saucy.cuffacur.fmc.Set(10);

Saucy.outonalimb.fmc.Toggle(true);
Saucy.outonalimb.fmc.Set(5);
```

`getStatus()` returns the configured enabled state. `hasRunState()`, `isRunning()`, and `getRunState()` expose the available runtime state.

```js
if (!Saucy.cuffacur.getStatus()) {
  Saucy.cuffacur.Toggle(true);
}

if (Saucy.cuffacur.hasRunState() && Saucy.cuffacur.isRunning()) {
  console.info(Saucy.cuffacur.getRunState());
}
```

### Slice Is Right movement setting

```js
Saucy.sliceisright.automove.Toggle(true);
Saucy.sliceisright.automove.Toggle(false);
```

This changes Saucy’s automatic movement setting for the Slice Is Right module. It does not enable the Saucy module itself.

## Stopping a script from code

```js
Exit();
```

`Exit()` stops the current script immediately.

## Dependency requirements

Saru requires a loaded BossMod or BossModReborn plugin, vNavMesh, TextAdvance, and Saucy. Cammy is optional. Saru shows its prerequisite window whenever a required dependency is unavailable.

## Error handling

An unhandled JavaScript error stops the script. Check optional integrations and target lookup results before using them.

```js
const source = Saucy.cards["Kobalos"];

if (source !== null && source.npc !== null) {
  console.info(source.npc.Name);
}
```

Use `try` and `catch` around work that can fail without ending the entire script.
