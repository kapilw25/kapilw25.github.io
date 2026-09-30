# Dataset example figures: fetch report

Fetched on 2026-09-24. Six sources, three figures each, 18 files. Every saved file came from an HTTP 200 download that PIL opened and verified; nothing was resized or re-encoded. Provenance per folder: `<folder>/provenance_figs.json`.

Scope: this report and the byte totals cover only the `fig_<n>.<ext>` files and `provenance_figs.json` written by this pass. Other files present in the same folders (`row_*.jpg`, `figure_card_libero-plus.png`, `figure_github_readme.webp`, `projectpage_pnp_*.jpg`) were not produced or modified by this pass.

## Summary

| folder | HTML or README | files | bytes |
|---|---|---:|---:|
| [groot_x_sim](groot_x_sim/) | arXiv HTML v2 + HF card 200 | 3 | 2,235,408 |
| [arena_g1](arena_g1/) | README 200 (badges only); LFS media 200 | 3 | 2,119,513 |
| [libero_plus_20k](libero_plus_20k/) | arXiv HTML v3 | 3 | 2,166,815 |
| [robocasa](robocasa/) | arXiv HTML v1 | 3 | 4,571,010 |
| [libero_90](libero_90/) | arXiv HTML v2 | 3 | 3,077,848 |
| [mimicgen](mimicgen/) | arXiv HTML v1 | 3 | 2,225,510 |
| total | | 18 | 16,396,104 (15.64 MB of the 40 MB budget) |

## 1. groot_x_sim (GR00T N1, arXiv 2503.14734 + HF card)

HTML: found. https://arxiv.org/html/2503.14734 resolves to v2 (v1 also 200, v3 404). Image srcs carry the `2503.14734v2/` prefix, so they resolve against https://arxiv.org/html/ (a first attempt resolved against https://arxiv.org/html/2503.14734v2/ and doubled the segment: 404 and 406 for every image; corrected URLs all returned 200).
Selection: Figure 7 (Simulation Tasks: RoboCasa top row, DexMimicGen middle row, tabletop bottom row, Omniverse renders) is the only figure in the paper that shows the GR00T-X-Embodiment-Sim data itself. Figure 1 (data pyramid) gives the dataset composition. No G1 or loco-manipulation figure exists in this paper (its sim data uses GR1 and single-arm embodiments only).
HF dataset card: https://huggingface.co/datasets/nvidia/PhysicalAI-Robotics-GR00T-X-Embodiment-Sim returned 200 on the API and README (not gated, license cc-by-4.0). The README carries one image (the card header), saved as fig_3.png. The repository has no other image files.
Failures: none after URL correction.

| file | figure | source | bytes | HTTP |
|---|---|---|---:|---|
| [fig_1.png](groot_x_sim/fig_1.png) | Figure 7 | GR00T N1 | 1,028,810 | 200 |
| [fig_2.png](groot_x_sim/fig_2.png) | Figure 1 | GR00T N1 | 1,093,157 | 200 |
| [fig_3.png](groot_x_sim/fig_3.png) | README image | GR00T-X-Embodiment-Sim (HF dataset card) | 113,441 | 200 |

## 2. arena_g1 (Isaac Lab-Arena GitHub + HF Arena cards)

README: https://raw.githubusercontent.com/isaac-sim/IsaacLab-Arena/main/README.md returned 200 (19,703 bytes) but references only shields.io badges; it has no task render or other image. The repo tree lists 155 image files under docs/images/, all stored in Git LFS (raw.githubusercontent.com returns the 131-byte LFS pointer, HTTP 200 text/plain). The LFS content is served by media.githubusercontent.com (HTTP 200 image/png), which is what the provenance source_url records. Licence: repository LICENSE.md is Apache-2.0.
Selection (repo docs images, marked "unnumbered", with the README situation stated in each caption): G1 loco-manipulation pick-and-place task view, GR1 open-microwave task view, Franka kitchen scene.
Dropped: docs/images/g1_galileo_arena_box_pnp_locomanip.gif (HTTP 200, 26,572,037 bytes, GIF 800x432) was downloaded and verified but then deleted because it pushed the total to 40.19 MB, over the 40 MB budget, and downscaling is not allowed in this pass. Re-fetch it if a later pass wants a G1 box-carry animation.
HF datasets (API https://huggingface.co/api/datasets?author=nvidia&search=Arena, HTTP 200, 6 hits, none gated, all cc-by-4.0): nvidia/Arena-G1-Loco-Manipulation-Task, nvidia/Arena-GR1-Manipulation-Task, nvidia/Arena-GR1-Manipulation-Task-v3, nvidia/Arena-GR1-Manipulation-PlaceItemCloseDoor-Task, nvidia/Arena-G1-Static-PickNPlace-Task, nvidia/Arena-DROID-Camera-Sensitivity-Workflow-Sample. The README cards of Arena-G1-Loco-Manipulation-Task, Arena-G1-Static-PickNPlace-Task and Arena-GR1-Manipulation-Task (all HTTP 200) contain no images, so nothing was saved from HF.
Failures: none (the HTTP 200 LFS pointers from raw.githubusercontent.com were not images and were not saved).

| file | figure | source | bytes | HTTP |
|---|---|---|---:|---|
| [fig_1.png](arena_g1/fig_1.png) | unnumbered | Isaac Lab-Arena | 784,531 | 200 |
| [fig_2.png](arena_g1/fig_2.png) | unnumbered | Isaac Lab-Arena | 514,226 | 200 |
| [fig_3.png](arena_g1/fig_3.png) | unnumbered | Isaac Lab-Arena | 820,756 | 200 |

## 3. libero_plus_20k (LIBERO-Plus, arXiv 2510.13626)

HTML: found. https://arxiv.org/html/2510.13626 resolves to v3 (v1, v2 also 200, v4 404).
The paper has no single figure that shows all seven perturbation dimensions with example frames. Figures 1, 2, 3, 5 and 8 are SVG plots (success-rate bars and curves); Figure 6 is a pie-style architecture chart; the example frames live in appendix Figures 11 to 16 (one rendering grid per dimension: background, camera, robot initial state, light, sensor noise, object layout; language has no rendering figure) and in Figures 17 to 19 (failure-mode panels across perturbation types).
Selection: Figure 17 (failure modes across perturbation types, the closest thing to a multi-dimension frame panel), Figure 12 (camera perturbation renders; note its caption verbatim says "background texture perturbations" although its labels are camera parameters), Figure 16 (object layout renders).
Not saved but available at https://arxiv.org/html/2510.13626v3/: dimension-background.png (Fig 11), dimension-init.png (Fig 13), dimension-light.png (Fig 14), dimension-noise.png (Fig 15).
Failures: none after URL correction.

| file | figure | source | bytes | HTTP |
|---|---|---|---:|---|
| [fig_1.png](libero_plus_20k/fig_1.png) | Figure 17 | LIBERO-Plus | 442,503 | 200 |
| [fig_2.png](libero_plus_20k/fig_2.png) | Figure 12 | LIBERO-Plus | 937,421 | 200 |
| [fig_3.png](libero_plus_20k/fig_3.png) | Figure 16 | LIBERO-Plus | 786,891 | 200 |

## 4. robocasa (RoboCasa, arXiv 2406.02523)

HTML: found. https://arxiv.org/html/2406.02523 resolves to v1 (v2 404). robocasa.ai was not needed.
Fig. 1's image (robots_in_kitchen.png) sits outside the `<figure>` element as an "[Uncaptioned image]" immediately above the Fig. 1 figcaption; the caption recorded is that figcaption. Figures 6, 7, 9 to 12 are tables or SVG plots.
Selection: Fig. 1 (overview: kitchen scenes, robots, tasks, datasets), Fig. 2 (kitchen floor plans), Fig. 5 (LLM-generated task examples). Also available: Fig. 3 appliances (fig3_4_comp.png), Fig. 4 objects (images/objects/Capture25_comp.png).
Failures: none after URL correction.

| file | figure | source | bytes | HTTP |
|---|---|---|---:|---|
| [fig_1.png](robocasa/fig_1.png) | Fig. 1 | RoboCasa | 2,991,274 | 200 |
| [fig_2.png](robocasa/fig_2.png) | Fig. 2 | RoboCasa | 1,099,678 | 200 |
| [fig_3.png](robocasa/fig_3.png) | Fig. 5 | RoboCasa | 480,058 | 200 |

## 5. libero_90 (LIBERO, arXiv 2306.03310)

HTML: found. https://arxiv.org/html/2306.03310 resolves to v2 (v1 also 200, v3 404).
Selection: Figure 1 (all four task suites), Figure 11 (LIBERO-100, which contains LIBERO-90 and LIBERO-10), Figure 8 (LIBERO-Spatial). Also available: figures/libero_object.png (Fig 9), figures/libero_goal.png (Fig 10).
Failures: none after URL correction.

| file | figure | source | bytes | HTTP |
|---|---|---|---:|---|
| [fig_1.png](libero_90/fig_1.png) | Figure 1 | LIBERO | 667,634 | 200 |
| [fig_2.png](libero_90/fig_2.png) | Figure 11 | LIBERO | 1,813,990 | 200 |
| [fig_3.png](libero_90/fig_3.png) | Figure 8 | LIBERO | 596,224 | 200 |

## 6. mimicgen (MimicGen, arXiv 2310.17596)

HTML: found. https://arxiv.org/html/2310.17596 resolves to v1 (v2 404).
Selection: Figure 1 (overview: generated data across scene configurations, objects and robot hardware), Figure F.1 (Panda source robot and Sawyer, IIWA, UR5e target robots), Figure K.2 (object-centric subtasks for selected tasks, i.e. task examples). Figure 3 (Tasks) and Figure L.1 (Tasks, all) are multi-panel figures built from 10 to 16 separate PNGs (task_1.png to task_14.png, x1.png to x5.png under https://arxiv.org/html/2310.17596v1/), so they were not saved as single files; a later pass can fetch the panels if a per-task strip is wanted.
Failures: none after URL correction.

| file | figure | source | bytes | HTTP |
|---|---|---|---:|---|
| [fig_1.png](mimicgen/fig_1.png) | Figure 1 | MimicGen | 835,217 | 200 |
| [fig_2.png](mimicgen/fig_2.png) | Figure F.1 | MimicGen | 711,600 | 200 |
| [fig_3.png](mimicgen/fig_3.png) | Figure K.2 | MimicGen | 678,693 | 200 |

## Method notes

arXiv HTML pages were fetched as https://arxiv.org/html/<id> and https://arxiv.org/html/<id>v1..v4 to find the live version. `<figure>` elements were parsed for figcaption text and `<img src>`; `<object data=...svg>` plots were skipped. Image srcs on these pages are of the form `<id>v<n>/<file>` and resolve against https://arxiv.org/html/. GitHub images were located from the repo tree because the README references none; LFS pointers were detected by content-type text/plain and 131-byte size and replaced by the media.githubusercontent.com URL. Captions are verbatim figcaption text truncated to 400 characters; for repo and card images the caption field describes the image location and README context. Licence for paper figures is recorded as "paper figure reproduced for research comparison"; repo and card images carry their stated licence (Apache-2.0, CC-BY-4.0).
