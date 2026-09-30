# Dataset example figures: fetch report

Fetched on 2026-09-24 from the arXiv HTML renderings (https://arxiv.org/html/<id>). Every saved raster was downloaded with HTTP 200 and verified with PIL (`Image.open(f).verify()`). No PDF screenshots, no third-party mirrors. Total on disk: 22.2 MB across six folders (cap 40 MB). Each folder has a `provenance_figs.json` with the exact image URL, figure number, verbatim caption (cut at 400 chars), licence note and fetch date.

## 1. warehouse500k (9th AI City Challenge, arXiv 2508.13564; SmolRGPT, arXiv 2509.15490; NVIDIA HF card)

- HTML: found. `https://arxiv.org/html/2508.13564` resolves to v1 (4 figures, 4 tables). `https://arxiv.org/html/2509.15490` resolves to v1 (3 figures).
- Saved:
  - `fig_1.png`, Figure 3 of 2508.13564 (`fig_warehouse_spatial_intelligence.png`), 832,295 bytes, 1787 x 779. Four warehouse RGB frames with coloured region masks, matching depth maps, the question text for distance, counting, multiple-choice grounding and spatial relation, a worked answer with normalized answer, and the question-type pie chart (215k distance, 114k MCQ grounding, 79k counting, 70k spatial relation). This is the primary example figure.
  - `fig_2.png`, Figure 3 of 2509.15490 SmolRGPT (`evaluation_pipeline.png`), 139,106 bytes, 2048 x 631. Shows the RGB, depth and region-mask inputs with one distance question and its numeric answer. Kept as a secondary illustration of the input format; SmolRGPT has no dedicated dataset example figure (Figures 1 and 2 are architecture and token substitution).
- Failed: NVIDIA dataset card README `https://huggingface.co/datasets/nvidia/PhysicalAI-Spatial-Intelligence-Warehouse/raw/main/README.md` returned HTTP 401 (gated: "You must have access to it and be authenticated"). Nothing taken from it.

## 2. sat175k (SAT, arXiv 2412.07755)

- HTML: found. `https://arxiv.org/html/2412.07755` resolves to v3.
- Saved:
  - `fig_1.png`, Figure 1 (`SAT_COLM_teaser_newdyn.png`), 404,912 bytes, 852 x 402. ProcTHOR frames with the static and dynamic question categories (Static, Perspective, Action Consequence, Goal Aim, Object Movement, Egocentric Movement) plus the real-image benchmark examples and result bars. Small source image.
  - `fig_2.svg` + `fig_2.png`, Figure 8 "Qualitative examples of our synthetic SAT dynamic data". arXiv serves this figure only as an SVG `<object>` (`QualExamplesSATSynth.svg`, 335,697 bytes, HTTP 200, with 7 embedded JPEG rasters). PIL cannot open SVG, so `fig_2.png` (1,971,176 bytes, 1325 x 1596) is a local rasterization made with `magick -density 300` and PIL-verified. The PNG is therefore a rendering, not a file served by arXiv; the SVG is the original. Both are flagged with a `note` in the provenance JSON.
  - `fig_3.svg` + `fig_3.png`, Figure 9 "Qualitative examples of our synthetic SAT static data" (`staticSYnth.svg`, 266,534 bytes, HTTP 200, 2 embedded JPEGs; PNG 600,877 bytes, 787 x 450), same rasterization procedure.
- Not saved (available): Figure 2 method diagram is also an SVG (`sat_colm_app.svg`, 592,761 bytes); skipped under the 3-figure cap.
- Tool note: the Homebrew `inkscape` wrapper is broken on this machine (missing app binary), so ImageMagick's internal SVG renderer was used; the output matched a `qlmanage` render visually.

## 3. vsi590k (Cambrian-S, arXiv 2511.04670)

- HTML: found. `https://arxiv.org/html/2511.04670` resolves to v1 (1.29 MB page, 25 figures).
- Saved:
  - `fig_1.png`, Figure 7 (`data_construct_v6.png`), 273,885 bytes, 1284 x 265. VSI-590K data curation pipeline: unannotated real videos (frames, 3D lifting, 3D semantics), SFT question templates, and annotated sim and real videos with scene description.
  - `fig_2.png`, Figure 19 (`annotated_real_video_1.png`), 600,341 bytes, 1190 x 299. Filmstrip of four annotated real-video frames. The figure's QA examples are HTML text beside the image, not pixels; that text (Absolute Direction and Absolute Distance questions with answers 334.09 and 2.32) is recorded in the provenance `note`.
  - `fig_3.png`, Figure 22 (`procthor.png`), 241,221 bytes, 1190 x 299. Filmstrip of four ProcTHOR simulated frames; adjacent Relative Distance (Object Perspective) question recorded in the `note`.
- Not saved (available): Figure 15 dataset statistics (question types and task groups) is two SVG panels (`vsi_piechart.svg`, `vsi_tasktype_chart.svg`); Figures 20, 21 (`annotated_real_video_2.png`, `s3dis.png`), 23 (`figs/hypersim.jpg`), 24, 25 (`figs/unannotated_image_1.jpg`, `figs/unannotated_image_2.jpg`) are further example filmstrips. All downloaded fine (HTTP 200) but skipped under the 3-figure cap.

## 4. osd87m (SpatialRGPT, arXiv 2406.01584)

- HTML: found. `https://arxiv.org/html/2406.01584` resolves to v3.
- Saved:
  - `fig_1.png`, Figure 1 (`data_pipeline_v1.png`), 1,682,374 bytes, 2031 x 1123. Open Spatial Dataset pipeline: filtering, open-vocabulary detection and segmentation (region masks), metric depth, camera calibration, point cloud processing, 3D scene graph, template QA and LLM reasoning QA.
  - `fig_2.png`, Figure 2 (`dataset_samples.png`), 1,783,899 bytes, 2030 x 996. Example data entries: first row template QAs, second row LLM-based QAs, each with numbered region tags on the photo.
- Not saved (available): unnumbered teaser (`teaser_v2.png`, 1,904,735 bytes) is a model-capability demo, not dataset examples; Figure 8 `bench_samples.png` is benchmark samples.
- Failed: none.

## 5. spatialqa50k (SpatialBot, arXiv 2406.13642)

- HTML: found. `https://arxiv.org/html/2406.13642` resolves to v7.
- Saved:
  - `fig_1.png`, Figure 2 (`figure_2.png`), 1,510,059 bytes, 2031 x 1266. SpatialQA low, middle and high level examples: RGB image, depth map, point depth, bounding-box depth, proximity, counting and spatial relationship QAs.
  - `fig_2.png`, Figure 9 (`spatialqa_samples_depth.png`), 1,670,688 bytes, 1501 x 1904. Depth-map description samples with image, depth map, question and answer.
  - `fig_3.png`, Figure 10 (`spatialqa_samples_spatial.png`), 3,154,219 bytes, 1910 x 1727. Spatial understanding samples with multi-turn QA.
- Not saved (available): Figure 5 (`img_source.png`, image sources and RGB to RGB-D conversion pipeline), Figure 11 (`spatialqa_samples_robot.png`, robot scenes).
- Failed: none.

## 6. robospatial1m (RoboSpatial, arXiv 2411.16537)

- HTML: found. `https://arxiv.org/html/2411.16537` resolves to v5.
- Saved:
  - `fig_1.png`, Figure 2 (`figure2.png`), 747,239 bytes, 1050 x 664. Dataset overview: 3D point cloud, image and 3D bounding boxes; spatial configuration, context and compatibility QAs (yes/no and point answers); ego-centric, world-centric and object-centric reference frames.
  - `fig_2.png`, Figure 1 (`figures/figure1.png`), 5,674,467 bytes, 2960 x 1668. Teaser with yes/no and point answers on a tabletop scene. Large file.
  - `fig_3.png`, Figure 5 (`supp_fig1.png`), 333,499 bytes, 894 x 402. 3D bounding boxes and the generated top-down map used for annotation.
- Failed: none.

## Failures and caveats in one place

- HTTP 401: Hugging Face dataset card for nvidia/PhysicalAI-Spatial-Intelligence-Warehouse (gated).
- SVG-only figures (SAT Figures 2, 8, 9; Cambrian-S Figure 15): the SVG downloads succeeded but PIL cannot verify SVG, so the two saved SAT figures carry both the original `.svg` and a local `.png` rasterization, labelled in `provenance_figs.json`.
- Cambrian-S example figures carry their QA text as HTML, not inside the image; the text is copied into the `note` field.
- All other requests returned HTTP 200 on the first try; no versioned URL fallbacks were needed.
