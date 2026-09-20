function Start() {}
function Stop() { return true; }
function OnDialog() { return true; }
function OnArrived() {}
function OnTime() {}
function OnReach() {}
function OnMessage(message) {}

addEventListener("dialog", OnDialog);
addEventListener("arrived", OnArrived);
addEventListener("time", OnTime);
addEventListener("reach", OnReach);
addEventListener("message", OnMessage);
