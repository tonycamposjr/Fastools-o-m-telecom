import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './skeuo.css';

/* PWA: quando um novo deploy assume o controle, recarrega a página sozinho
   (fim do "precisa limpar o cache"); procura atualizações a cada minuto e ao
   voltar para a aba. Em dev fica inativo (sem service worker atrapalhando o HMR). */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const recarregarNaTroca = () => window.location.reload();
  navigator.serviceWorker.addEventListener('controllerchange', recarregarNaTroca);

  const procurarAtualizacao = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
    } catch {
      /* offline — tenta de novo no próximo ciclo */
    }
  };

  window.setInterval(procurarAtualizacao, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void procurarAtualizacao();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
