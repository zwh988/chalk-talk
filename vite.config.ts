import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({base:'./',plugins:[react(),VitePWA({registerType:'autoUpdate',manifest:{name:'Chalk Talk',short_name:'Chalk Talk',description:'9-ball logging and training',theme_color:'#14575a',background_color:'#f2f5f4',display:'standalone',start_url:'./',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]}})]});
