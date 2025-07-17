local damage = ...

engine:onEnemyNoteHit(function()
    local current = engine:getHealth() -- obtener la salud actual
    engine:setHealth(current - (damage or 0.020))
end)