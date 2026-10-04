import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
import {applyTheme} from './theme';
applyTheme();matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
navigator.storage?.persist?.();
createRoot(document.getElementById('root')!).render(<App/>);
