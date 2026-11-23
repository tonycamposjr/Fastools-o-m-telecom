/**
 * Camada de movimento — utilitários compartilhados.
 *
 * Regras do projeto:
 *  - animar só transform/opacity (leve em celular simples);
 *  - respeitar a preferência do sistema (prefers-reduced-motion) e a chave
 *    "Animações reduzidas" das Configurações (localStorage 'motion');
 *  - nada em loop contínuo.
 */
import { flushSync } from 'react-dom';

export type MotionPref = 'auto' | 'reduced';

const KEY = 'motion';

/** Lê a escolha salva (padrão: automático = segue o sistema). */
export function readMotionPref(): MotionPref {
  try {
    return localStorage.getItem(KEY) === 'reduced' ? 'reduced' : 'auto';
  } catch {
    return 'auto';
  }
}

/** Aplica no <html> (data-motion) e persiste. */
export function applyMotionPref(pref: MotionPref): void {
  try {
    document.documentElement.setAttribute('data-motion', pref);
    localStorage.setItem(KEY, pref);
  } catch {
    /* armazenamento indisponível: só não persiste */
  }
}

/** true quando o usuário (ou o sistema) pede menos movimento. */
export function prefersReducedMotion(): boolean {
  try {
    if (document.documentElement.getAttribute('data-motion') === 'reduced') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Executa uma troca de tela com View Transition (fade + deslize curto).
 * Sem suporte do navegador, ou com movimento reduzido, apenas executa a troca.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }
  try {
    doc.startViewTransition(() => {
      // flushSync garante que o React já pintou a nova tela quando o navegador captura o "depois"
      flushSync(update);
    });
  } catch {
    update();
  }
}

/** easeOutCubic (0..1) — usada nas animações em canvas. */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
