"use client";

import { Search, MapPin, Zap, Loader2, X } from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import citiesRaw from "@/lib/cities.json";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Municipio {
  id: number;
  nome: string;
  uf: string;
}

const MUNICIPIOS: Municipio[] = citiesRaw as Municipio[];

// ─── Normaliza texto (remove acentos, lowercase) ──────────────────────────────
function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ─── Destaca a parte digitada na sugestão ─────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const normText = normalize(text);
  const normQuery = normalize(query);
  const idx = normText.indexOf(normQuery);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-violet-500/30 text-violet-200 rounded px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Componente CityAutocomplete ──────────────────────────────────────────────
interface CityAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (val: string) => void;
}

function CityAutocomplete({ value, onChange, onSelect }: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtra localmente — sem nenhuma chamada de rede
  const suggestions = useMemo(() => {
    const q = value.trim();
    if (!q || q.length < 2) return [];
    const normQ = normalize(q);
    return MUNICIPIOS.filter((m) =>
      normalize(m.nome).startsWith(normQ) ||
      normalize(`${m.nome} ${m.uf}`).includes(normQ) ||
      normalize(`${m.nome}, ${m.uf}`).includes(normQ)
    ).slice(0, 10);
  }, [value]);

  useEffect(() => {
    setHighlighted(0);
    setOpen(suggestions.length > 0);
  }, [suggestions]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback(
    (city: Municipio) => {
      onSelect(`${city.nome}, ${city.uf}`);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Palavra pura para highlight (sem ", UF")
  const queryWord = value.includes(",") ? value.split(",")[0].trim() : value.trim();

  return (
    <div ref={containerRef} className="relative flex-1">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />

      <input
        ref={inputRef}
        id="input-city"
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder="Cidade / Estado (ex: São Paulo, SP)"
        className={`w-full pl-10 pr-8 py-3 bg-slate-800/60 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
          open ? "border-violet-500/50" : "border-slate-700"
        }`}
      />

      {/* Limpar */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(""); setOpen(false); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50">
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              <span className="text-violet-400 font-semibold">{MUNICIPIOS.length.toLocaleString("pt-BR")}</span> municípios
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-xs text-slate-500">
              <span className="text-white font-medium">{suggestions.length}</span> resultado{suggestions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Lista */}
          <ul className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((city, i) => (
              <li key={city.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(city); }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    highlighted === i
                      ? "bg-violet-600/20 text-white"
                      : "text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  <MapPin
                    className={`w-3.5 h-3.5 shrink-0 ${
                      highlighted === i ? "text-violet-400" : "text-slate-600"
                    }`}
                  />
                  <span className="flex-1 text-sm font-medium">
                    <HighlightMatch text={city.nome} query={queryWord} />
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md tabular-nums ${
                      highlighted === i
                        ? "bg-violet-500/30 text-violet-300"
                        : "bg-slate-700/80 text-slate-400"
                    }`}
                  >
                    {city.uf}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Footer atalhos */}
          <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/70 flex items-center gap-3">
            {[
              { key: "↑↓", label: "navegar" },
              { key: "↵", label: "selecionar" },
              { key: "Esc", label: "fechar" },
            ].map(({ key, label }) => (
              <span key={key} className="text-slate-600 text-[10px] flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-500 text-[10px]">{key}</kbd>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SearchBar principal ──────────────────────────────────────────────────────
interface SearchBarProps {
  onSearch: (niche: string, city: string) => void;
  loading: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (niche.trim() && city.trim()) {
      onSearch(niche.trim(), city.trim());
    }
  };

  const quickNiches = ["Clínicas", "Oficinas", "Restaurantes", "Salões", "Academias", "Pet Shop"];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        {/* Nicho */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-niche"
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Nicho (ex: Clínicas, Oficinas...)"
            className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Cidade com Autocomplete — 5.571 municípios offline */}
        <CityAutocomplete
          value={city}
          onChange={setCity}
          onSelect={(val) => setCity(val)}
        />

        {/* Botão */}
        <button
          id="btn-scan"
          type="submit"
          disabled={loading || !niche.trim() || !city.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Rastreando...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Rastrear Leads
            </>
          )}
        </button>
      </form>

      {/* Quick Niches */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center">Busca rápida:</span>
        {quickNiches.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNiche(n)}
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-violet-500/50 text-slate-400 hover:text-violet-300 rounded-full transition-all"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
