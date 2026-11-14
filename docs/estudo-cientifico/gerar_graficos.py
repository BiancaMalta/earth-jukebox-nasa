# AI-assisted: OpenAI Codex
"""Recreate study figures from the versioned CSV/JSON, without network access."""
from pathlib import Path
import csv
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent
rows = list(csv.DictReader((ROOT / "dados/comparacao-ponderada.csv").open()))
labels = {"Africa": "África", "South America": "América do Sul", "North America": "América do Norte", "Europe": "Europa*", "Asia": "Ásia*", "Oceania": "Oceania", "Antarctica": "Antártida"}
fig, axes = plt.subplots(1, 3, figsize=(15, 6), layout="constrained")
for ax, kind, title in zip(axes, ["temperature", "humidity", "wind"], ["Temperatura (°C)", "Umidade específica (g/kg)", "Média condicional do vento (m/s)"]):
    data = [r for r in rows if r["variable"] == kind]
    y = np.arange(len(data))
    for offset, key, label, color in [(-.25, "before_image_mean_equal_pixels", "Imagem antes: pixels iguais", "#ad7b53"), (0, "current_image_mean", "Imagem: ponderada por área", "#187a63"), (.25, "reference_area_mean", "GEOS-FP: ponderado por área", "#3e66a6")]:
        ax.barh(y + offset, [float(r[key]) for r in data], height=.24, label=label, color=color)
    ax.set_yticks(y, [labels[r["group"]] for r in data]); ax.invert_yaxis(); ax.set_title(title, fontsize=11); ax.grid(axis="x", alpha=.2); ax.axvline(0, color="gray", linewidth=.5)
axes[0].legend(fontsize=7, loc="lower right")
fig.suptitle("Comparação de estimativas: antes e depois da ponderação", fontsize=14)
fig.supxlabel("Um instante aproximado: imagem 30/10/2026 ~10h UTC; GEOS-FP média 10–11h UTC, grade ~1,25°.\n*Europa inclui toda a Rússia; fronteiras e pesos não tornam essa comparação uma validação exata. Vento: média condicional, não o novo índice sonoro.", fontsize=8)
fig.savefig(ROOT / "graficos/comparacao-ponderada.png", dpi=180); plt.close(fig)

result = json.loads((ROOT / "dados/validacao-vento-qualitativo.json").read_text())
fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), layout="constrained")
x = np.arange(3)
axes[0].bar(x-.18, [s["spearman"]["conditional_mean"] for s in result["samples"]], .35, label="Média condicional anterior", color="#ad7b53")
axes[0].bar(x+.18, [s["spearman"]["visual_signal"] for s in result["samples"]], .35, label="Índice visual", color="#187a63")
axes[0].set_xticks(x, [f"Frame {s['frame']}\n{len(s['rows'])} países" for s in result["samples"]]); axes[0].set_ylim(0, 1); axes[0].set_ylabel("Correlação de ordenação (Spearman)"); axes[0].set_title("Ordenação entre países"); axes[0].legend(fontsize=8)
thresholds = ["0", "0.25", "0.5", "1"]
for offset, key, label, color in [(-.18,"conditional_mean","Média anterior","#ad7b53"),(.18,"visual_signal","Índice visual","#187a63")]:
    data=[result["temporal_direction"][t][key] for t in thresholds]
    axes[1].bar(np.arange(4)+offset,[100*d["same_direction"]/d["pairs"] for d in data],.35,label=label,color=color)
axes[1].set_xticks(np.arange(4), [">0", ">0,25", ">0,5", ">1"]); axes[1].set_xlabel("Mudança mínima na referência (m/s)"); axes[1].set_ylim(0,100); axes[1].set_ylabel("Concordância de direção (%)"); axes[1].set_title("Aumentou ou diminuiu?")
fig.suptitle("Vento: avaliação qualitativa exploratória em três instantes", fontsize=13)
fig.supxlabel("Não é precisão de medição. Mesma família GEOS; grade grosseira e hipótese temporal. Países sem sinal são relatados separadamente.\nTrês instantes orientaram a escolha do índice: ainda não há conjunto de teste independente.", fontsize=8)
fig.savefig(ROOT / "graficos/vento-ordenacao-tendencias.png", dpi=180); plt.close(fig)
print("Study figures regenerated.")
