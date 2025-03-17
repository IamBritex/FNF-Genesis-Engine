export function createMenuOption(scene, x, y, option, isSelected = false) {
    const optionText = scene.add.text(x, y, option.name, {
        fontFamily: 'Courier New',
        fontSize: '28px',
        fontStyle: 'bold',
        color: isSelected ? '#FFFF00' : '#FFFFFF',
        stroke: isSelected ? '#000000' : null,
        strokeThickness: isSelected ? 4 : 0
    }).setOrigin(0, 0.5);

    let valueText;
    if (option.type === 'checkbox') {
        valueText = scene.add.text(x + 300, y, option.value ? 'ON' : 'OFF', {
            fontFamily: 'Courier New',
            fontSize: '26px',
            color: isSelected ? '#FFFF00' : '#BBBBBB'
        }).setOrigin(1, 0.5);
    } else if (option.type === 'keybind' || option.type === 'text') {
        valueText = scene.add.text(x + 300, y, option.value, {
            fontFamily: 'Courier New',
            fontSize: '26px',
            color: isSelected ? '#FFFF00' : '#BBBBBB'
        }).setOrigin(1, 0.5);
    } else if (option.type === 'number') {
        valueText = scene.add.text(x + 300, y, option.value.toString(), {
            fontFamily: 'Courier New',
            fontSize: '26px',
            color: isSelected ? '#FFFF00' : '#BBBBBB'
        }).setOrigin(1, 0.5);
    }

    return { option: optionText, value: valueText };
}