# AI-assisted: Copilot
"""Calibrate colorbars for supported NASA SVS weather visualizations."""

from __future__ import annotations

import argparse
from collections import defaultdict
from io import BytesIO
import json
from pathlib import Path
import sys

import requests
from PIL import Image, UnidentifiedImageError

IMAGE_SIZE = (528, 165)
PROFILES = {
    5147: {
        "plain_url": (
            "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005147/"
            "NearSurfaceTemperature_colorbar_plain.png"
        ),
        "labeled_url": (
            "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005147/"
            "NearSurfaceTemperature_colorbar.png"
        ),
        "source": "NASA SVS 5147 NearSurfaceTemperature_colorbar_plain.png",
        "bar_x_min": 73,
        "bar_x_max": 462,
        "sample_x_min": 73,
        "bar_y": 95,
        "value_min": -40.0,
        "value_max": 40.0,
        "unit": "°C",
        "reference_pixels": ((122, -30.0), (268, 0.0), (415, 30.0)),
        "output_path": Path("public/data/clima-temperatura/colorbar.json"),
    },
    5148: {
        "plain_url": (
            "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005148/"
            "NearSurfaceWindSpeed_colorbar_plain.png"
        ),
        "labeled_url": (
            "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005148/"
            "NearSurfaceWindSpeed_colorbar.png"
        ),
        "source": "NASA SVS 5148 NearSurfaceWindSpeed_colorbar_plain.png",
        "bar_x_min": 73,
        "bar_x_max": 462,
        "sample_x_min": 107,
        "bar_y": 95,
        "value_min": 0.0,
        "value_max": 40.0,
        "unit": "m/s",
        "reference_pixels": ((122, 5.0), (268, 20.0), (415, 35.0)),
        "visible_min": 3.5,
        "visible_max": 34.5,
        "pixel_filter": {
            "minSaturation": 40,
            "maxColorDistance": 30,
            "maxValue": 34.5,
        },
        "output_path": Path("public/data/clima-vento/colorbar.json"),
    },
    5149: {
        "plain_url": (
            "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005149/"
            "Precipitation_colorbar_plain.png"
        ),
        "labeled_url": (
            "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005149/"
            "Precipitation_colorbar.png"
        ),
        "source": "NASA SVS 5149 Precipitation_colorbar_plain.png",
        "bar_x_min": 75,
        "bar_x_max": 462,
        "sample_x_min": 75,
        "bar_y": 95,
        "value_min": 0.0,
        "value_max": 20.0,
        "unit": "mm",
        "reference_pixels": ((112, 2.0), (268, 10.0), (424, 18.0)),
        "pixel_filter": {
            "minSaturation": 40,
            "maxColorDistance": 30,
        },
        "output_path": Path("public/data/clima-chuva/colorbar.json"),
    },
    5150: {
        "plain_url": (
            "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005150/"
            "NearSurfaceHumidity_colorbar_plain.png"
        ),
        "labeled_url": (
            "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005150/"
            "NearSurfaceHumidity_colorbar.png"
        ),
        "source": "NASA SVS 5150 NearSurfaceHumidity_colorbar_plain.png",
        "bar_x_min": 73,
        "bar_x_max": 462,
        "sample_x_min": 73,
        "bar_y": 95,
        "value_min": 0.0,
        "value_max": 22.0,
        "unit": "g/kg",
        "reference_pixels": ((108, 2.0), (268, 11.0), (429, 20.0)),
        "pixel_filter": {
            "minSaturation": 40,
            "maxColorDistance": 30,
        },
        "output_path": Path("public/data/clima-umidade/colorbar.json"),
    },
}


def _download_image(url: str) -> Image.Image:
    response = requests.get(url, timeout=(15, 60))
    response.raise_for_status()
    try:
        with Image.open(BytesIO(response.content)) as source:
            image = source.convert("RGB")
    except (OSError, UnidentifiedImageError) as error:
        raise ValueError(f"Imagem de legenda inválida em {url}: {error}") from error
    if image.size != IMAGE_SIZE:
        raise ValueError(f"Dimensão inesperada para a legenda em {url}: {image.size}")
    return image


def _value_at_x(x: int, profile: dict) -> float:
    position = (x - profile["bar_x_min"]) / (
        profile["bar_x_max"] - profile["bar_x_min"]
    )
    return profile["value_min"] + position * (
        profile["value_max"] - profile["value_min"]
    )


def _calibrate(plain: Image.Image, labeled: Image.Image, profile: dict) -> dict:
    for x, expected_value in profile["reference_pixels"]:
        plain_rgb = plain.getpixel((x, profile["bar_y"]))
        labeled_rgb = labeled.getpixel((x, profile["bar_y"]))
        if plain_rgb != labeled_rgb:
            raise ValueError(f"A legenda simples e a rotulada divergem no pixel x={x}.")
        actual_value = _value_at_x(x, profile)
        if abs(actual_value - expected_value) > 0.5:
            raise ValueError(
                f"Pixel x={x} representa {actual_value:.2f}{profile['unit']}, "
                f"mas a legenda indica {expected_value:g}{profile['unit']}."
            )
        print(
            f"OK: RGB {plain_rgb} em x={x} -> "
            f"{actual_value:.2f}{profile['unit']} "
            f"(legenda: {expected_value:g}{profile['unit']})"
        )

    values_by_rgb: dict[tuple[int, int, int], list[float]] = defaultdict(list)
    for x in range(profile["sample_x_min"], profile["bar_x_max"] + 1):
        values_by_rgb[plain.getpixel((x, profile["bar_y"]))].append(
            _value_at_x(x, profile)
        )

    samples = [
        {"rgb": list(rgb), "value": round(sum(values) / len(values), 3)}
        for rgb, values in sorted(
            values_by_rgb.items(),
            key=lambda item: sum(item[1]) / len(item[1]),
        )
    ]
    colorbar = {
        "source": profile["source"],
        "unit": profile["unit"],
        "scale": "linear",
        "vmin": profile["value_min"],
        "vmax": profile["value_max"],
        "samples": samples,
    }
    if "visible_min" in profile:
        colorbar["visibleMin"] = profile["visible_min"]
        colorbar["visibleMax"] = profile["visible_max"]
    if "pixel_filter" in profile:
        colorbar["pixelFilter"] = profile["pixel_filter"]
    return colorbar


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Calibra a legenda de uma visualização meteorológica NASA SVS."
    )
    parser.add_argument(
        "--svs-id",
        type=int,
        choices=sorted(PROFILES),
        default=5147,
        help="ID SVS da visualização (padrão: 5147).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="arquivo de saída (padrão: caminho correspondente ao ID SVS).",
    )
    args = parser.parse_args(argv)
    profile = PROFILES[args.svs_id]
    output_path = args.output or profile["output_path"]

    try:
        plain = _download_image(profile["plain_url"])
        labeled = _download_image(profile["labeled_url"])
        colorbar = _calibrate(plain, labeled, profile)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(colorbar, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    except (OSError, requests.RequestException, ValueError) as error:
        print(f"Erro: {error}", file=sys.stderr)
        return 1

    print(f"Concluído: {output_path} ({len(colorbar['samples'])} cores)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
