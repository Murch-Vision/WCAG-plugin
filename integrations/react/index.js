/**
 * React / Next.js интеграц.
 *
 *   import { HurteemjProvider, useHurteemj } from 'hurteemj/react';
 *   <HurteemjProvider config={{ level: 'AA', fix: 'safe', uiLang: 'mn' }}><App/></HurteemjProvider>
 *
 * Next.js App Router: 'use client' компонент дотор ашиглана. SSR үед юу ч хийхгүй.
 */
import { createContext, createElement, useContext, useEffect, useRef, useState } from 'react';

const Ctx = createContext(null);

export function useHurteemjInstance(config = {}) {
  const [api, setApi] = useState(null);
  const cfg = useRef(config);
  useEffect(() => {
    let alive = true;
    let inst;
    import('../../dist/hurteemj.esm.js').then(({ init }) => {
      if (!alive) return;
      inst = init(cfg.current);
      setApi(inst);
    });
    return () => { alive = false; if (cfg.current.destroyOnUnmount) inst?.destroy(); };
  }, []);
  return api;
}

export function HurteemjProvider({ config, children }) {
  const api = useHurteemjInstance(config);
  return createElement(Ctx.Provider, { value: api }, children);
}

/** Тайлан/тохиргоонд хандах hook. Route солигдох бүрт автоматаар дахин шалгана (pushState ажиглалт). */
export function useHurteemj() {
  const api = useContext(Ctx);
  const [report, setReport] = useState(api?.report || null);
  useEffect(() => {
    const on = (e) => setReport(e.detail);
    document.addEventListener('hurteemj:audit', on);
    return () => document.removeEventListener('hurteemj:audit', on);
  }, []);
  return { api, report };
}

/** Өөрийн дизайнтай нээх товч: <HurteemjButton>Хүртээмж</HurteemjButton> */
export function HurteemjButton({ children = 'Хүртээмж', ...props }) {
  return createElement('button', { type: 'button', 'data-hurteemj-open': '', ...props }, children);
}
