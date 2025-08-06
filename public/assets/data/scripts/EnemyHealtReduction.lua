local damage = ...  -- Get the first argument

-- Ensure damage is a number and has a default value
damage = type(damage) == "number" and damage or 0.020

-- Register the event handler
engine.onEnemyNoteHit(function()
    local current = engine.getHealth() -- Get current health
    if type(current) == "number" then
        engine.setHealth(current - damage)
    end
end)