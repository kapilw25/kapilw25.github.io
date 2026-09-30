# ROWS_REPORT: real sample rows from six spatial-VQA training sets

Fetched on 2026-09-24. Folder: `papers/p01-spatial-vqa/docs/assets/qual/`. Every saved image came from an HTTP 200 download whose bytes PIL opened and verified; nothing was synthesised, cropped or re-encoded. Only files named `row_*`, `card_fig_4_types.png` and `provenance_rows.json` belong to this pass; `fig_*` files, `provenance_figs.json` and `FIGS_REPORT.md` come from the paper-figure pass. Bytes written by this pass: 9,074,680 B (9.07 MB). Whole `qual/` tree including the figure pass: 31,316,097 B (31.32 MB), under the 40 MB budget.

Headline: the datasets-server rows API was unusable for all three "viewer" datasets named in the brief (array/SAT HTTP 500, VSI-590K and OpenSpatialDataset HTTP 501), so rows were obtained through documented fallbacks: the array/SAT-v2 mirror (working viewer), the raw `vsi_590k.jsonl`, the raw `result_10_depth_convs.json` head plus the official Open Images bucket, and the RoboSpatial-Home viewer. The warehouse set and all RussRobin (SpatialQA) repos are gated (HTTP 401, x-error-code GatedRepo), so no rows exist for them.

<!-- md-tables: prose max_cols=6 -->
| dataset folder | source repo | rows recorded | media files saved | media bytes | licence (card / croissant) |
|---|---|---|---|---|---|
| sat175k | array/SAT-v2 (array/SAT viewer broken) | 8 | 10 (2 rows have 2 frames) | 222,911 | null on SAT-v2; array/SAT card says mit |
| vsi590k | nyu-visionx/VSI-590K | 8 | 0 (media inside multi-GB tar.gz) | 0 | apache-2.0 |
| osd87m | a8cheng/OpenSpatialDataset | 8 | 8 (Open Images bucket) | 2,416,815 | null (no card; GitHub badge says Apache 2.0) |
| warehouse500k | nvidia/PhysicalAI-Spatial-Intelligence-Warehouse | 0 (gated) | 1 card figure, not a row | 4,225,077 | cc-by-4.0 |
| spatialqa50k | RussRobin/SpatialQA | 0 (gated, no viewer) | 0 | 0 | cc-by-4.0 |
| robospatial1m | chanhee-luke/RoboSpatial-Home (benchmark; training set has no HF repo) | 8 | 8 | 2,159,250 | apache-2.0 |

## 1. sat175k (array/SAT, served from array/SAT-v2)

What did not work
- `https://datasets-server.huggingface.co/splits?dataset=array%2FSAT` : HTTP 200 (configs default; splits train, static, val, test).
- `https://datasets-server.huggingface.co/rows?dataset=array%2FSAT&config=default&split=train&offset=0&length=20` : HTTP 500, `TooBigRowGroupsError: first row group has 5204829455 bytes` then `ArrowNotImplementedError`. Same 500 for `split=static`.
- `https://datasets-server.huggingface.co/first-rows?dataset=array%2FSAT&config=default&split=train` : HTTP 501 (job manager crashed).
- `https://datasets-server.huggingface.co/croissant?dataset=array%2FSAT` : HTTP 404 (endpoint moved); `https://huggingface.co/api/datasets/array/SAT/croissant` : HTTP 200, license mit.
- pyarrow is not installed locally, so reading `SAT_test.parquet` (88 MB) directly was not attempted.

What worked
- The array/SAT card says: "If you wish to use the latest versions of Huggingface ... check out the updated version of SAT here (array/SAT-v2). It is the same dataset but compatible with the latest versions."
- `https://datasets-server.huggingface.co/splits?dataset=array%2FSAT-v2` : HTTP 200.
- `https://datasets-server.huggingface.co/rows?dataset=array%2FSAT-v2&config=default&split=train&offset=<N>&length=100` for N in 0, 20000, 40000, 60000, 80000, 100000, 120000, 140000, 160000 : HTTP 200, num_rows_total 172384. Features: images (list of Image with `src`), question, answers, correct_answer, question_type.
- Each chosen row was re-fetched with `offset=<row_idx>&length=1` (cached-asset URLs expire within minutes) and every `src` downloaded: 10 image downloads, all HTTP 200, all PIL-verified JPEG 512x512.
- `https://huggingface.co/api/datasets/array/SAT-v2/croissant` : HTTP 200 but license null; SAT-v2 README has no license field. Recorded licence null with a licence_note pointing to the array/SAT mit declaration.

Coverage note: the `question_type` field is "other" for rows 0 to about 160000 (all static questions) and takes the values action_sequence, obj_movement, goal_aim, action_consequence only in the dynamic tail. Static kinds were therefore inferred from wording (recorded in `question_kind_inferred`, the verbatim field stays in `question_type`). No static perspective-taking question ("if I stand at X facing Y") appeared in the 900 sampled rows; perspective is covered by goal_aim and action_consequence.

<!-- md-tables: prose max_cols=6 -->
| row | file | question_type | question (start) | answer |
|---|---|---|---|---|
| 0 | row_0.jpg | other (inferred: count) | How many Chairs are visible in the scene? | 3 |
| 40006 | row_40006.jpg | other (inferred: depth) | Which object is closer to the camera taking this photo, black circular chair with four leg | blue armchair with wooden legs (highligh |
| 80001 | row_80001.jpg | other (inferred: relation_lr) | Considering the relative positions, is white color chair (marked A) to the left or right o | left |
| 120008 | row_120008.jpg | other (inferred: relation_3d) | Consider the 3D positions of the objects in the scene and not just the 2D positions in the | no |
| 160007 | row_160007.jpg | action_consequence | If I turn left by 40 degrees, will I be facing away from beige armchair with rounded arms  | yes |
| 160009 | row_160009.jpg | goal_aim | I need to go to black octagon armchair with green cushion (near the mark 7 in the image).  | left by 26 degrees |
| 160013 | row_160013.jpg | action_sequence | The first image is from the beginning of the video and the second image is from the end. H | rotated right and moved forward |
| 160021 | row_160021.jpg | obj_movement | Were any of the objects in the initial frame that you can still see in the second frame mo | no objects moved |

## 2. vsi590k (nyu-visionx/VSI-590K)

What did not work
- `https://datasets-server.huggingface.co/splits?dataset=nyu-visionx%2FVSI-590K` : HTTP 200 (default/train).
- `https://datasets-server.huggingface.co/rows?dataset=nyu-visionx%2FVSI-590K&config=default&split=train&offset=0&length=20` : HTTP 501, "Job manager crashed while running this job (missing heartbeats)".
- Media: the repo holds only `vsi_590k.jsonl` plus nine archives (adt, arkitscenes, hypersim, procthor, robotics, s3dis, scannet, scannetppv2, ytb_roomtour .tar.gz, 1.1 GB to 90 GB each). gzip is not seekable, so no single frame or video can be fetched. No media downloaded; `file` is null for all 8 rows.

What worked
- `https://huggingface.co/datasets/nyu-visionx/VSI-590K/resolve/main/vsi_590k.jsonl` : HTTP 200, 276,557,539 bytes, downloaded to scratch (not kept). 590,667 rows; 374,148 video rows and 216,519 image rows; 12 question types; sources hypersim 176774, scannetppv2 138701, scannet 92145, adt 60207, arkitscenes 57816, ytb_roomtour 20100, procthor 20092, robotics 19645, s3dis 5187.
- `https://huggingface.co/api/datasets/nyu-visionx/VSI-590K/croissant` : HTTP 200, license apache-2.0 (card also says apache-2.0).
- 8 rows chosen to cover 8 distinct question types and all 8 media sources that appear at those types; exact line indices recorded, plus `media_path` and `media_archive_url`.

<!-- md-tables: prose max_cols=6 -->
| row | file | question_type | question (start) | answer |
|---|---|---|---|---|
| 0 | null | relative_direction_object | <image> These are frames of a video. From the viewpoint at the chair looking toward the ba | A |
| 155095 | null | absolute_distance_object | <image> These are frames of a video. Specify precisely how far apart the whiteboard and th | 240.0 |
| 257588 | null | absolute_count | <image> These are frames of a video. Can you count how many table(s) are in this room? Ple | 4 |
| 379566 | null | absolute_size_object | <image> These are frames of a video. Give the longest dimension of the window in feet. Ple | 6.8 |
| 507343 | null | relative_size_object | <image> These are frames of a video. Between the fridge and the laundry basket, which obje | A |
| 530834 | null | appearance_order | <image> These are frames of a video. What will be the first-time appearance order of the f | B. shelving unit, doorway, arm chair, wi |
| 550922 | null | relative_direction_camera | <image> From the camera's viewpoint, is the table positioned on the left-hand side or righ | A |
| 570911 | null | relative_distance_camera | <image> Which category appears closer to the camera's viewpoint: a mattress or a pillow? O | A |

## 3. osd87m (a8cheng/OpenSpatialDataset)

What did not work
- `https://datasets-server.huggingface.co/rows?dataset=a8cheng%2FOpenSpatialDataset&config=default&split=train&offset=0&length=20` : HTTP 501 (job manager crashed).
- `https://huggingface.co/datasets/a8cheng/OpenSpatialDataset/resolve/main/README.md` : HTTP 404, no dataset card. Croissant (`https://huggingface.co/api/datasets/a8cheng/OpenSpatialDataset/croissant`, HTTP 200) reports license null. Licence recorded as null; the SpatialRGPT GitHub README shows a "Data License Apache 2.0" badge (recorded in licence_note only).

What worked
- Repo tree: a single file `result_10_depth_convs.json` (31,932,495,962 bytes). `https://huggingface.co/datasets/a8cheng/OpenSpatialDataset/resolve/main/result_10_depth_convs.json` with `Range: bytes=0-1000000` : HTTP 206; the head parses as a JSON array and yields 26 complete entries, each with keys filename (Open Images id), conversations (10 human/gpt pairs with `<mask> <depth>` region tokens), rle (COCO masks with [h, w] size) and bbox.
- Images: the HF repo is annotation-only. The SpatialRGPT README says "For raw images, please download OpenImages from OpenImagesV7" and links the Open Images download page; the official downloader (`github.com/openimages/dataset/blob/master/downloader.py`) reads bucket `open-images-dataset`, key `<split>/<image_id>.jpg`. For the first 8 entries `https://s3.amazonaws.com/open-images-dataset/train/<image_id>.jpg` returned HTTP 200 and PIL verified each JPEG; every image's (w, h) equals the row's rle mask size, which confirms the id-to-image match. Saved as row_0.jpg to row_7.jpg with `media: image`; the per-row `annotation_source_url` points at the HF JSON. If the page must stay strictly HF-sourced, drop the files and treat the rows as annotation-only; the text fields stand on their own.

<!-- md-tables: prose max_cols=6 -->
| row | file | question_type | question (start) | answer |
|---|---|---|---|---|
| 0 | row_0.jpg | null | <image> Does <mask> <depth> have a greater width compared to <mask> <depth>? | In fact, Region [0] might be narrower th |
| 1 | row_1.jpg | null | <image> You are a mechanic and you need to store <mask> <depth> in a storage room. The sto | No, Region [0] is 3.65 feet in height, s |
| 2 | row_2.jpg | null | <image> You are a tourist looking at a map of a city. You see a house represented by <mask | The house represented by Region [0] is h |
| 3 | row_3.jpg | null | <image> You are a photographer taking a picture of two people. You want to capture both fa | You are 39.02 inches away from Region [1 |
| 4 | row_4.jpg | null | <image> Can you confirm if <mask> <depth> is wider than <mask> <depth>? | Indeed, Region [0] has a greater width c |
| 5 | row_5.jpg | null | <image> Does <mask> <depth> come behind <mask> <depth>? | Yes, it is. |
| 6 | row_6.jpg | null | <image> What is the vertical distance between <mask> <depth> and <mask> <depth>? | Region [0] is 39.78 centimeters away fro |
| 7 | row_7.jpg | null | <image> How big is <mask> <depth> in terms of width? | It is 12.57 inches. |

## 4. warehouse500k (nvidia/PhysicalAI-Spatial-Intelligence-Warehouse)

- `https://huggingface.co/api/datasets/nvidia/PhysicalAI-Spatial-Intelligence-Warehouse` : HTTP 200, gated auto, license cc-by-4.0.
- `https://huggingface.co/datasets/nvidia/PhysicalAI-Spatial-Intelligence-Warehouse/resolve/main/README.md` : HTTP 200 (card readable; 499k train, 19k test, 1.9k val QA pairs; ~95k RGB-D pairs; categories left_right, multi_choice_question, distance, count; LLaVA-format json with rle masks and normalized_answer).
- `https://huggingface.co/api/datasets/nvidia/PhysicalAI-Spatial-Intelligence-Warehouse/tree/main` and `.../tree/main/train_sample/images` : HTTP 200 (file names visible, e.g. train_sample/images/001511.png, 3,037,736 B).
- `.../resolve/main/train_sample/train_sample.json`, `.../resolve/main/train_sample/images/001511.png`, `.../resolve/main/val.json` : HTTP 401, x-error-code GatedRepo.
- `https://datasets-server.huggingface.co/splits?dataset=nvidia%2FPhysicalAI-Spatial-Intelligence-Warehouse` : HTTP 401.
- Card figures: `https://cdn-uploads.huggingface.co/production/uploads/6769a8b58d83c97167755934/TsyI8lNG3iUqAPzTvBhTt.png` : HTTP 200, 4,225,077 B, PIL ok 3082x1820, saved as `card_fig_4_types.png` (four question categories with example QA; labelled row_index -1, not a data row). `.../Wiw3e7Q_KQNP0j6sj2FjT.gif` : HTTP 200, 8,968,826 B, not downloaded (size budget).
- Provenance: gated true, zero rows.

## 5. spatialqa50k (RussRobin/SpatialQA)

- WebSearch located `https://huggingface.co/datasets/RussRobin/SpatialQA` (plus SpatialQA-E and SpatialBench under the same account; GitHub BAAI-DCAI/SpatialBot).
- `https://huggingface.co/api/datasets/RussRobin/SpatialQA` : HTTP 200, gated auto, license cc-by-4.0. Same for SpatialQA-E and SpatialBench.
- `https://huggingface.co/datasets/RussRobin/SpatialQA/resolve/main/README.md` : HTTP 200 (card: `SpatialQA.json` plus high-level images 2d3ds, kitti, nyudepthv2, sa1b in the repo; low and middle-level images from BoyaWu10/Bunny-v1_0-data; depth maps built per the SpatialBot instructions).
- Tree (HTTP 200): SpatialQA.json 1,681,561,646 B, 2d3ds.zip, kitti.zip, nyudepthv2.zip, nyudepthv2_d.zip, sa1b-1..4.tar.
- `https://datasets-server.huggingface.co/splits?dataset=RussRobin%2FSpatialQA` : HTTP 401 (no viewer). `.../resolve/main/SpatialQA.json` (Range 0-3000000) : HTTP 401 GatedRepo. `.../resolve/main/nyudepthv2_d.zip` : HTTP 401. `RussRobin/SpatialQA-E/resolve/main/dry_run_cube.tar.gz` : HTTP 401. `splits?dataset=RussRobin%2FSpatialBench` : HTTP 401.
- Provenance: gated true, no viewer, zero rows.

## 6. robospatial1m (RoboSpatial; served from chanhee-luke/RoboSpatial-Home)

- WebSearch found `https://huggingface.co/datasets/chanhee-luke/RoboSpatial-Home` (benchmark, 350 questions) and the generation code `github.com/NVlabs/RoboSpatial`; no public HF repo for the 1M-image training set (the NVlabs README distributes the annotation generator, not pre-generated data; `github.com/chanhee-luke/RoboSpatial` is only the project-page template). The benchmark repo is therefore used, as the brief allows.
- `https://datasets-server.huggingface.co/splits?dataset=chanhee-luke%2FRoboSpatial-Home` : HTTP 200; config default; splits context (122), compatibility (105), configuration (123). Features: category, question, answer, img, depth_image, mask.
- `https://datasets-server.huggingface.co/rows?dataset=chanhee-luke%2FRoboSpatial-Home&config=default&split=<split>&offset=<idx>&length=1` : HTTP 200 for every request. Each `img.src` downloaded: HTTP 200, PIL-verified JPEG 1440x1920. Only the RGB image was saved (depth_image and mask flagged in provenance).
- `https://huggingface.co/api/datasets/chanhee-luke/RoboSpatial-Home/croissant` : HTTP 200, license apache-2.0.
- Row 0 of all three splits is the same photograph, so two of those were swapped for other rows; files are named `row_<split>_<idx>.jpg` because indices repeat across splits.

<!-- md-tables: prose max_cols=6 -->
| row | file | question_type | question (start) | answer |
|---|---|---|---|---|
| compatibility/17 | row_compatibility_17.jpg | compatibility | Can the cup fit above the counter? Answer yes or no. | Yes |
| compatibility/63 | row_compatibility_63.jpg | compatibility | Can the microwave fit in front of the fridge? Answer yes or no. | Yes |
| compatibility/70 | row_compatibility_70.jpg | compatibility | Can the TV fit in front of the media console? Answer yes or no. | Yes |
| configuration/0 | row_configuration_0.jpg | configuration | Is the picture above the desk? Answer yes or no. | Yes |
| configuration/41 | row_configuration_41.jpg | configuration | Is the chair left of the desk? Answer yes or no. | No |
| configuration/82 | row_configuration_82.jpg | configuration | Is the cat tower right of the chair? Answer yes or no. | Yes |
| context/30 | row_context_30.jpg | context | In the image, there is a rug. Pinpoint several points within the vacant space situated to  | [(0.013, 0.596), (0.278, 0.557), (0.323, |
| context/61 | row_context_61.jpg | context | In the image, there is a curtain. Pinpoint several points within the vacant space situated | [(0.539, 0.746), (0.544, 0.813), (0.508, |

## Provenance schema

Each `<folder>/provenance_rows.json` is a JSON list with the requested keys (file, media, source_url, dataset, config, split, row_index, question <= 300 chars, answer <= 120 chars, question_type, licence, fetched_on) plus dataset-specific helpers: SAT `files`, `source_urls`, `answer_choices`, `question_kind_inferred`; VSI `media_path`, `media_archive_url`; OSD `annotation_source_url`, `openimages_image_id`, `n_qa_pairs_in_row`, `n_regions`, `image_size_wh`; RoboSpatial-Home `image_size_wh`, `has_depth_image`, `has_mask`; gated sets `gated`, `http`. Rows with `row_index: -1` are status or card-figure entries, not data rows.

## Addendum 2026-09-24: VSI-590K frames

Six frames were extracted from robotics.tar.gz (1.1 GB, the smallest archive) for rows 550922, 550923, 550932, 550995, 555913 and 550957 (line indices in vsi_590k.jsonl), covering six question types; the four remaining rows stay text-only. Two gated sets await access: run `fetch_gated_rows.py` once `HF_TOKEN` is in `.env`.

## Addendum 2026-09-24, gated sets fetched

Access granted; `fetch_gated_rows.py` pulled 8 Warehouse-500K rows from `train_sample` (2 per category, images re-encoded as JPEG) and 8 SpatialQA rows from the head of `SpatialQA.json` (4 from 2d3ds.zip, 2 from nyudepthv2.zip with depth maps from nyudepthv2_d.zip, 2 text-only whose images live in Bunny_695k). Log: the gated fetch log under the lab repo's logs folder (not exported).
