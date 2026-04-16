import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    base: './',
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'games',
                    dest: '.'
                },
                {
                    src: 'libs',
                    dest: '.'
                }
            ]
        })
        // VitePWA desactivado para evitar recargas constantes en el totem
    ],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: 'index.html',
                catch: 'games/Catch-the-Empanada/index.html',
                crush: 'games/Empanada-Crush/index.html',
                puzzle: 'games/Empanada-Puzzle/index.html',
                pacman: 'games/PacMan-Empanada/index.html',
                bubbleshooter: 'games/Bubble-Empanada-Shooter/index.html',
                memorygame: 'games/MemoryGame/index.html',
            }
        }
    }
});
