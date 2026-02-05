export class CharactersData {
  static extractChartData(chartData) {
    if (chartData) {
      return {
        player: chartData.player,
        enemy: chartData.enemy,
        gfVersion: chartData.gfVersion, 
        bpm: chartData.bpm || 100, 
        speed: chartData.speed || 1
      };
    }
    return null;
  }

  static extractStageData(stageContent) {
    const charData = { player: null, enemy: null, playergf: null };
    if (stageContent && stageContent.stage) {
      for (const item of stageContent.stage) {
        if (item.player) charData.player = item.player;
        else if (item.enemy) charData.enemy = item.enemy;
        else if (item.playergf) charData.playergf = item.playergf;
      }
    } else {
      charData.player = { position: [770, 100], scale: 1, layer: 1 };
      charData.enemy = { position: [100, 100], scale: 1, layer: 1 };
      charData.playergf = { position: [400, 130], scale: 1, layer: 0 };
    }
    return charData;
  }
}