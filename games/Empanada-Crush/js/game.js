const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a1a1a',
    scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
    },
    scene: [BootScene, PreloaderScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);
