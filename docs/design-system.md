# hai — Design System

> Tema: **Terracota / Terra Quente**
> Paleta escura com fundo em marrom profundo, acento em laranja terracota e texto em pergaminho.

---

## Paleta de Cores

### Primary — Terracota

| Token | Hex | Uso |
|-------|-----|-----|
| primary-50 | `#FEF3EC` | — |
| primary-100 | `#FADADC` | — |
| primary-200 | `#F5B898` | — |
| primary-300 | `#E88A50` | — |
| primary-400 | `#D06828` | hover, ativo |
| **primary-500** ★ | `#C05010` | **accent principal** |
| primary-600 | `#963A0A` | pressed |
| primary-700 | `#702806` | — |
| primary-800 | `#4A1800` | — |
| primary-900 | `#2A0A00` | — |

### Neutral — Terra Quente

| Token | Hex | Uso |
|-------|-----|-----|
| neutral-50 | `#F5EAD8` | — |
| neutral-100 | `#E8D4B8` | — |
| neutral-200 | `#C8A880` | — |
| neutral-300 | `#A07858` | texto secondary |
| neutral-400 | `#785040` | — |
| neutral-500 | `#503020` | — |
| neutral-600 | `#382010` | — |
| neutral-700 | `#281408` | — |
| neutral-800 | `#180A02` | — |
| neutral-900 | `#0E0600` | fundo base |

### Cálamo — Ouro (destaques)

| Hex | Uso |
|-----|-----|
| `#FFF8DC` | — |
| `#F5E8A8` | — |
| `#F0D880` | — |
| `#D8B840` | destaque ouro |
| `#A88010` | ouro escuro |
| `#705008` | ouro profundo |

### Semânticas

| Estado | Fundo | Texto |
|--------|-------|-------|
| success | `#1A6028` | `#5DC87A` |
| warning | `#C07808` | `#F5D068` |
| error | `#A02020` | `#F5A0A0` |
| info | `#186090` | `#88C8F0` |

---

## Tokens de Interface

### Superfícies

| Token | Hex | Onde usar |
|-------|-----|-----------|
| `--surface-base` | `#0E0600` | rail, fundo raiz |
| `--surface-default` | `#130900` | sidebar, painéis |
| `--surface-elevated` | `#1A0E05` | editor principal |
| `--surface-overlay` | `#221408` | modais, dropdowns |
| `--surface-interactive` | `#2A1A08` | hover, items selecionados |

### Bordas

| Token | Hex |
|-------|-----|
| `--border-subtle` | `#1E1005` |
| `--border-default` | `#2A1808` |
| `--border-strong` | `#3A2010` |
| `--border-accent` | `#C05010` |

### Texto

| Token | Hex | Uso |
|-------|-----|-----|
| `--text-primary` | `#F0DEC8` | corpo principal, títulos |
| `--text-secondary` | `#A07850` | metadados, labels |
| `--text-muted` | `#604830` | placeholders, desabilitado leve |
| `--text-disabled` | `#3A2010` | desabilitado |
| `--text-accent` | `#E07830` | links, destaques inline |
| `--text-on-accent` | `#F0DEC8` | texto sobre fundo acento |

### Ação / Acento

| Token | Hex | Estado |
|-------|-----|--------|
| `--accent-primary` | `#C05010` | default |
| `--accent-hover` | `#D06828` | hover |
| `--accent-pressed` | `#A03E08` | pressed |
| `--accent-subtle` | `#2A1408` | fundo dim |

---

## Tipografia

Fontes: **Inter Variable** (sans) · **JetBrains Mono** (mono)

| Escala | Tamanho | Peso | Uso |
|--------|---------|------|-----|
| display | 48px | 300 | logo, splash |
| heading-1 | 32px | 400 | títulos de página |
| heading-2 | 24px | 400 | seções |
| heading-3 | 18px | 500 | sub-seções |
| body | 14px | 400 | texto padrão |
| small | 12px | 400 | metadados, timestamps |
| caption | 10px | 500 | labels uppercase |
| mono | 13px | 400 | código, paths |

---

## Formas

### Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `radius-sm` | `2px` | badges, chips pequenos |
| `radius-md` | `6px` | botões, inputs, cards |
| `radius-lg` | `10px` | modais, painéis |
| `radius-xl` | `16px` | containers principais |
| `radius-full` | `9999px` | pills, avatares |

### Espaçamento (base 4px)

| Token | Valor |
|-------|-------|
| `space-xs` | `4px` |
| `space-sm` | `8px` |
| `space-md` | `12px` |
| `space-lg` | `16px` |
| `space-xl` | `24px` |
| `space-2xl` | `32px` |
| `space-3xl` | `48px` |
| `space-4xl` | `64px` |

---

## Ícones de Interface

Stroke weight: **1.5px** · Tamanho padrão: **20px** · Cor: `--text-accent` (`#E07830`)

| Ícone | Uso |
|-------|-----|
| file + linhas | nova nota |
| lupa | buscar |
| sliders | configurar |
| seta circular | sincronizar |
| tag | tags |
| `<>` | código |
| pasta | coleção |
| estrela | favorito |
| correntes | linkar nota / wikilink |
| lápis | editar |
| lixeira | excluir |
| balão | comentário |
| relógio | histórico |
| lua | tema |
| nuvem + seta | exportar |
| cadeado | privado |
| nós | compartilhar |

---

## Variáveis CSS (globals.css)

```css
:root {
  /* Superfícies */
  --app-rail:        #0A0400;
  --app-sidebar:     #0E0600;
  --app-list:        #130900;
  --app-main:        #1A0E05;
  --app-surface:     #221408;

  /* Acento */
  --app-accent:      #C05010;
  --app-accent-dim:  rgba(192, 80, 16, 0.12);
  --app-accent-glow: rgba(192, 80, 16, 0.20);

  /* Bordas */
  --app-border:      #1E1005;
  --app-border-mid:  #2A1808;

  /* Texto */
  --app-text-1:      #F0DEC8;
  --app-text-2:      #A07850;
  --app-text-3:      #604830;

  /* Estados */
  --app-hover:       rgba(192, 80, 16, 0.06);
  --app-selected:    rgba(192, 80, 16, 0.12);
  --app-tag-bg:      rgba(192, 80, 16, 0.08);
  --app-tag-text:    #A07850;
}
```
