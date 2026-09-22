Runs the Gold Saucer GATEs Air Force One, The Slice Is Right and the Wind Blows by walking to the NPCs to join the GATEs. Between GATEs it either plays Cuff-a-Cur or, when configured, uses Chocoholic for Chocobo Racing.

## Chocoholic mode

Enable **Chocobo Racing instead of Cuff-a-cur** to use Chocoholic. Before every queue, the script sets Chocoholic's **Number of races** to `1`.

**No Chocoholic Queue [X] Minutes before Gate** controls the queue deadzone (1–10 minutes, default 5). It never stops a race already in progress. Instead, the script waits for the race's MGP payout, disables Chocoholic at that point, waits 20 seconds, and only then decides whether another race may be queued. If the deadzone has begun, it waits for the GATE. If a GATE announcement arrives while a race is still running, the script also waits for that payout before travelling to the GATE. Once Hunga, Yojinbo, or Air Force One has been entered, all between-GATE activity remains locked until that GATE's MGP payout is detected.

Chocoholic is optional. When it is not loaded, its calls are harmless no-ops and Saru does not show it as a required dependency.
