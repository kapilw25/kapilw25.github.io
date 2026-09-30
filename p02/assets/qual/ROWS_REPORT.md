# Qualitative rows: fetch report

Fetched on 2026-09-24. Six rival robot-manipulation datasets, real sample frames or figures only. Every saved file came from an HTTP 200 download that PIL opened and verified; every source video was deleted after frame extraction. Provenance per folder: `<folder>/provenance_rows.json` (schema: file, media, source_url, dataset, episode, frame_time_s, camera, instruction, robot, licence, gated, fetched_on, note).

## Run history and scope

- The run was cut off by a rate limit right after the libero_90 frames were saved (03:49) and resumed later. On resume only [libero_90/provenance_rows.json](libero_90/provenance_rows.json) and this report were written; the other five provenance_rows.json files were left as found.
- Between 06:53:38 and 06:53:41, outside this run, an external pass rewrote four provenance_rows.json files (groot_x_sim, arena_g1, libero_plus_20k, robocasa) and downscaled the four large image items to 1600 px wide. Their schema fields are unchanged; a `local_processing` field was added to the downscaled items. The LeRobot video frames were not touched. Quoted from those files:
- [libero_plus_20k/figure_card_libero-plus.png](libero_plus_20k/figure_card_libero-plus.png): `resized to fit 1600 px on 2026-09-24; source bytes at source_url`
- [robocasa/projectpage_pnp_36.jpg](robocasa/projectpage_pnp_36.jpg): `resized to fit 1600 px on 2026-09-24; source bytes at source_url`
- [robocasa/projectpage_pnp_145.jpg](robocasa/projectpage_pnp_145.jpg): `resized to fit 1600 px on 2026-09-24; source bytes at source_url`
- [robocasa/figure_github_readme.webp](robocasa/figure_github_readme.webp): `resized to fit 1600 px on 2026-09-24; source bytes at source_url`
- Items whose bytes on disk differ from the bytes fetched:
- [libero_plus_20k/figure_card_libero-plus.png](libero_plus_20k/figure_card_libero-plus.png): fetched 2,774,457 B, now 650,019 B, now 1600x678
- [robocasa/projectpage_pnp_36.jpg](robocasa/projectpage_pnp_36.jpg): fetched 189,169 B, now 170,832 B, now 1600x900
- [robocasa/projectpage_pnp_145.jpg](robocasa/projectpage_pnp_145.jpg): fetched 187,427 B, now 169,254 B, now 1600x900
- [robocasa/figure_github_readme.webp](robocasa/figure_github_readme.webp): fetched 3,439,390 B, now 241,788 B, now 1600x853
- Files not produced by this pass and excluded from its counts: `fig_<n>.png`, `provenance_figs.json` in every folder and [FIGS_REPORT.md](FIGS_REPORT.md) (the figure pass).
- Budget: 1,480,824 B on disk now for this pass (1.48 MB of the 40 MB cap); 6,839,374 B as fetched before the external downscale. Largest single download was 2,149,317 B (a video, deleted). Whole qual folder including the figure pass: about 23 MB.
- HF token: every repo probed reports `gated: false` on the API, so HF_TOKEN was never read into the shell, never sent and never printed.

## Method (common to all LeRobot rows)

1. Repo ids from notes_01.md (grep GR00T-X, Arena, G1, LIBERO, RoboCasa, MimicGen) plus WebSearch for LIBERO-Plus and RoboCasa mirrors.
2. Listing through the tree API `https://huggingface.co/api/datasets/<repo>/tree/main/<path>`; the smallest mp4 of the chosen camera folder was picked.
3. `curl -sL` on the `/resolve/main/` URL. Without `-L` HF answers 307 (redirect to `/api/resolve-cache/` or the xet CDN); with `-L` every download ended 200.
4. `ffprobe` for duration and r_frame_rate, then `ffmpeg -ss <t> -i <mp4> -frames:v 1 -q:v 2` at 20 and 80 percent of the duration; the frame index in the file name is round(t times fps). PIL verify, mean and std pixel check (no black or constant frames), then `rm` of the mp4.
5. Instruction text copied verbatim from `meta/tasks.jsonl` and `meta/episodes.jsonl` of the same task folder.

## Summary

| folder | source used for rows | items in provenance_rows.json | files saved | bytes now |
|---|---|---:|---:|---:|
| [groot_x_sim](groot_x_sim/) | nvidia/PhysicalAI-Robotics-GR00T-X-Embodiment-Sim | 2 video-frame | 2 | 68,096 |
| [arena_g1](arena_g1/) | nvidia/Arena-G1-* (Loco-Manipulation, Static-PickNPlace) | 4 video-frame | 4 | 99,796 |
| [libero_plus_20k](libero_plus_20k/) | Sylvest/LIBERO-plus, Sylvest/libero_plus_rlds | 1 image (card figure), 1 annotation-only | 1 | 651,712 |
| [robocasa](robocasa/) | infope/robocasa, robocasa.ai, github.com/robocasa/robocasa | 4 video-frame, 1 image, 1 annotation-only | 5 | 617,224 |
| [libero_90](libero_90/) | IPEC-COMMUNITY/libero_90_no_noops_lerobot | 4 video-frame | 4 | 38,586 |
| [mimicgen](mimicgen/) | amandlek/mimicgen_datasets | 5 annotation-only (media null) | 0 | 5,410 |
| total | | 23 | 16 | 1,480,824 |

## 1. groot_x_sim (GR00T-X-Embodiment-Sim)

Repo found: nvidia/PhysicalAI-Robotics-GR00T-X-Embodiment-Sim (notes_01.md row 1), API 200, gated false, licence cc-by-4.0. Root tree has 134 task folders; exactly one is G1: `unitree_g1.LMPnPAppleToPlateDC` (LeRobot v2.1, 103 episodes, 78,369 frames, 50 fps, one camera `observation.images.ego_view` 480x640; embodiment.json robot_name G1, tag `unitree_g1_full_body_with_height_nav_cmd_sim`). GR1 folders (gr1_arms_waist.*, gr1_unified.*, gr1_full_upper_body.*) were not sampled.
Method: smallest of 103 ego_view mp4s, episode 77 (1,029,146 B), two frames, video deleted.
HTTP codes: tree API 200 at every level; the first meta fetch without `-L` returned 307 for tasks.jsonl, episodes.jsonl, info.json, embodiment.json (redirect only; refetched with `-L`: 200, 122 B, 18,335 B, 7,995 B, 156 B); video 200 (redirected to us.aws.cdn.hf.co xet bridge). No failures.
Instruction (tasks.jsonl task_index 1; episodes.jsonl episode 77, length 549, trajectory_type successful): "pick up the apple, walk left, and place the apple on the plate".
Files: [row_77_110.jpg](groot_x_sim/row_77_110.jpg) t=2.196 s, 30,858 B; [row_77_439.jpg](groot_x_sim/row_77_439.jpg) t=8.784 s, 34,846 B. Both 640x480.
URLs:
- video: https://huggingface.co/datasets/nvidia/PhysicalAI-Robotics-GR00T-X-Embodiment-Sim/resolve/main/unitree_g1.LMPnPAppleToPlateDC/videos/chunk-000/observation.images.ego_view/episode_000077.mp4
- meta: https://huggingface.co/datasets/nvidia/PhysicalAI-Robotics-GR00T-X-Embodiment-Sim/resolve/main/unitree_g1.LMPnPAppleToPlateDC/meta/tasks.jsonl and .../meta/episodes.jsonl
- tree: https://huggingface.co/api/datasets/nvidia/PhysicalAI-Robotics-GR00T-X-Embodiment-Sim/tree/main/unitree_g1.LMPnPAppleToPlateDC/videos/chunk-000/observation.images.ego_view

## 2. arena_g1 (Isaac Lab-Arena G1 demo sets)

Repos found (notes_01.md rows 140 and 204), both API 200, gated false, cc-by-4.0, both with `lerobot/` (data, meta, videos) plus HDF5:
- nvidia/Arena-G1-Loco-Manipulation-Task: card says 50 MimicGen demos from 5 human teleop demos; the lerobot export lists 100 episodes, 94,936 frames, 50 fps, robot_type unitree_g1, one camera ego_view 480x640, 100 mp4s. HDF5: arena_g1_loco_manipulation_dataset_annotated.hdf5 (213,998,386 B), arena_g1_loco_manipulation_dataset_generated_small.hdf5 (230,115,530 B), arena_g1_loco_manipulation_dataset_generated.hdf5 (23,362,617,731 B).
- nvidia/Arena-G1-Static-PickNPlace-Task: card says 200 human XR-teleop demos; the lerobot export lists 251 episodes, 35,066 frames, 50 fps, unitree_g1, ego_view 480x640, 208 mp4s. HDF5: arena_g1_static_apple_dataset_recorded_200_demos.hdf5 (10,074,757,576 B).
Method: LeRobot mp4, smallest per repo: Loco episode 15 (2,149,317 B, 880 frames, 17.6 s) and Static episode 97 (213,540 B, 113 frames, 2.26 s, a short clip). Two frames each, videos deleted.
HTTP codes: tree 200 everywhere; meta 307 without `-L` then 200 (tasks.jsonl 146 B and 120 B, episodes.jsonl 16,799 B and 29,637 B, info.json 6,832 B each, README 200); videos 200. No failures.
Instructions (tasks.jsonl, verbatim): Loco "Pick up the brown box from the shelf, and place it into the blue bin on the table located at the right of the shelf."; Static "Pick up the apple from the shelf and place it onto the plate on the same shelf next to it."
Files: [row_loco_15_176.jpg](arena_g1/row_loco_15_176.jpg) t=3.52 s, 28,548 B; [row_loco_15_704.jpg](arena_g1/row_loco_15_704.jpg) t=14.08 s, 23,971 B; [row_static_97_23.jpg](arena_g1/row_static_97_23.jpg) t=0.452 s, 19,677 B; [row_static_97_90.jpg](arena_g1/row_static_97_90.jpg) t=1.808 s, 22,803 B. All 640x480.
URLs:
- https://huggingface.co/datasets/nvidia/Arena-G1-Loco-Manipulation-Task/resolve/main/lerobot/videos/chunk-000/observation.images.ego_view/episode_000015.mp4
- https://huggingface.co/datasets/nvidia/Arena-G1-Static-PickNPlace-Task/resolve/main/lerobot/videos/chunk-000/observation.images.ego_view/episode_000097.mp4
- meta: https://huggingface.co/datasets/nvidia/Arena-G1-Loco-Manipulation-Task/resolve/main/lerobot/meta/tasks.jsonl and https://huggingface.co/datasets/nvidia/Arena-G1-Static-PickNPlace-Task/resolve/main/lerobot/meta/tasks.jsonl

## 3. libero_plus_20k (LIBERO-Plus, arXiv 2510.13626)

Repos found by WebSearch, both API 200, gated false, licence mit:
- Sylvest/LIBERO-plus: README.md (7,546 B), assets.zip (6,395,849,578 B: new objects, textures, scenes for the perturbed benchmark), static/images/libero-plus.png. No mp4, no parquet.
- Sylvest/libero_plus_rlds (the training trajectories): libero_plus_mixdata.zip (11,119,747,860 B), libero_plus_mixdata.z01 (32,212,254,720 B), libero_plus_mixdata.z02 (32,212,254,720 B), a 75.5 GB multi-part zip of RLDS/TFRecord, plus static/images. Not streamable.
Method: neither mp4 nor a working rows API, so the repo trees were recorded and the pass stopped for trajectory frames (media null for the trajectories). One real dataset-card figure was saved as an `image` item, clearly labelled as a figure and not a frame; drop it if only rows are wanted. The 20k trajectory count comes from the paper and was not verified from the archives.
HTTP codes (failures): datasets-server `/rows?dataset=Sylvest/LIBERO-plus&config=default&split=train` returned 500 ("Job manager crashed while running this job"); `/splits?dataset=Sylvest/LIBERO-plus` returned 501. Figure download 200.
Files: [figure_card_libero-plus.png](libero_plus_20k/figure_card_libero-plus.png), fetched as 3660x1550 PNG, 2,774,457 B; now 650,019 B, 1600x678 after the external downscale.
URLs:
- https://huggingface.co/datasets/Sylvest/LIBERO-plus/resolve/main/static/images/libero-plus.png
- https://huggingface.co/api/datasets/Sylvest/LIBERO-plus/tree/main and https://huggingface.co/api/datasets/Sylvest/libero_plus_rlds/tree/main
- https://datasets-server.huggingface.co/rows?dataset=Sylvest/LIBERO-plus&config=default&split=train&offset=0&length=1 (500)

## 4. robocasa (RoboCasa, arXiv 2406.02523)

Mirrors found by WebSearch and notes_01.md, all API 200, gated false:
- infope/robocasa (mit): LeRobot v2.1 per-task re-export of the official RoboCasa v1.0 `pretrain/atomic` human teleop demos (the RoboCasa365 release of github.com/robocasa/robocasa) merged with GR00T N1.5 rollouts, 17 tasks, 3 cameras 256x256 at 20 fps, robot PandaOmron. Used for rows.
- nvidia/RoboCasa-Cosmos-Policy (cc): the 2024-paper task set (24 atomic tasks, per-task folders dated 2024-04-24), HDF5 only, 224x224 images. Recorded as annotation-only.
- haosulab/RoboCasa (mit): robocasa_dataset.zip (3,732,420,246 B) of scene assets for ManiSkill, no demos.
- Whalswp/NVIDIA-Robocasa-Kitchen (notes_01.md row 235, 353 GB) was not probed.
Method: (a) LeRobot mp4 from infope/robocasa, task PickPlaceCounterToCabinet, episode 0 (source human, is_success true, layout_id 34, style_id 35, 232 frames, 11.6 s), camera robot0_agentview_left, 151,370 B, two frames, video deleted. (b) Project page https://robocasa.ai fetched with curl (200) and grepped for media: 20 mp4 clips and only team photos as images (the WebFetch summary listed just the photos). Clip `basic_skills/pnp.mp4` (613,427 B, 1920x1080, 30 fps, 6.03 s) downloaded, two frames, deleted. (c) GitHub README (raw, 200) header figure docs/images/readme.webp saved as an `image` item. README License section: Code MIT, Assets and Datasets CC BY 4.0; robocasa.ai itself shows no licence text.
HTTP codes: all 200 (tree, meta 307 then 200 with `-L`, videos, HTML, raw image, HEAD checks). No failures.
Instruction (infope tasks.jsonl task_index 1, episodes.jsonl episode 0): "Pick the cereal from the counter and place it in the cabinet."
Files: [row_0_46.jpg](robocasa/row_0_46.jpg) t=2.32 s, 14,498 B; [row_0_186.jpg](robocasa/row_0_186.jpg) t=9.28 s, 15,769 B (256x256); [projectpage_pnp_36.jpg](robocasa/projectpage_pnp_36.jpg) t=1.207 s, fetched 189,169 B, now 170,832 B 1600x900; [projectpage_pnp_145.jpg](robocasa/projectpage_pnp_145.jpg) t=4.827 s, fetched 187,427 B, now 169,254 B 1600x900; [figure_github_readme.webp](robocasa/figure_github_readme.webp) fetched 5973x3183, 3,439,390 B, now 241,788 B 1600x853.
URLs:
- https://huggingface.co/datasets/infope/robocasa/resolve/main/pretrain_atomic/PickPlaceCounterToCabinet/lerobot/videos/chunk-000/observation.images.robot0_agentview_left/episode_000000.mp4
- https://huggingface.co/datasets/infope/robocasa/resolve/main/pretrain_atomic/PickPlaceCounterToCabinet/lerobot/meta/tasks.jsonl and .../meta/episodes.jsonl
- https://robocasa.ai/assets/videos/basic_skills/pnp.mp4
- https://raw.githubusercontent.com/robocasa/robocasa/main/docs/images/readme.webp
- https://huggingface.co/api/datasets/nvidia/RoboCasa-Cosmos-Policy/tree/main/all_episodes and https://huggingface.co/api/datasets/haosulab/RoboCasa/tree/main

## 5. libero_90 (LIBERO, arXiv 2306.03310)

Mirrors verified through the API (all 200, gated false):
- HuggingFaceVLA/libero: data/ and meta/ only, no videos/ folder (images inside parquet; pyarrow is not installed here), not used.
- physical-intelligence/libero: data/ and meta/ only, no videos/, not used.
- nvidia/LIBERO_LeRobot_v3 (notes_01.md row 118, licence other openmdw1.1): libero_90 suite in LeRobot v3 shards, 3921 episodes, 569,249 frames, 20 fps, franka; the smallest video shard `libero_90/videos/observation.images.image/chunk-000/file-009.mp4` is 40,925,233 B and the other nine are about 158 MB, all above the 30 MB cap, so not downloaded.
- lerobot/libero (apache-2.0): v3 shards of 1693 episodes and 40 tasks (the four 10-task suites, not LIBERO-90), not used.
- IPEC-COMMUNITY/libero_90_no_noops_lerobot (apache-2.0): LeRobot v2.1 per-episode mp4s, 3921 episodes and 569,249 frames (identical counts to the nvidia libero_90 suite), franka, cameras observation.images.image and observation.images.wrist_image at 256x256 (AV1). Used for rows.
Method: episode 0, both cameras, videos 491,798 B and 244,794 B, two frames each, videos deleted.
HTTP codes (failures): lerobot/libero meta/tasks.jsonl and meta/episodes.jsonl returned 404 (expected, v3 stores tasks in parquet); nvidia/LIBERO_LeRobot_v3 meta 307 then 200 (info.json 4,998 B, tasks.parquet 3,959 B, unreadable here without pyarrow). Everything for IPEC-COMMUNITY returned 200.
Instruction (tasks.jsonl task_index 0, episodes.jsonl episode 0, length 161): "pick up the book and place it in the right compartment of the caddy".
Files: [row_0_32.jpg](libero_90/row_0_32.jpg) t=1.61 s, 10,836 B; [row_0_129.jpg](libero_90/row_0_129.jpg) t=6.44 s, 9,694 B; [row_0_32_wrist.jpg](libero_90/row_0_32_wrist.jpg) t=1.61 s, 5,558 B; [row_0_129_wrist.jpg](libero_90/row_0_129_wrist.jpg) t=6.44 s, 7,102 B. All 256x256.
URLs:
- https://huggingface.co/datasets/IPEC-COMMUNITY/libero_90_no_noops_lerobot/resolve/main/videos/chunk-000/observation.images.image/episode_000000.mp4
- https://huggingface.co/datasets/IPEC-COMMUNITY/libero_90_no_noops_lerobot/resolve/main/videos/chunk-000/observation.images.wrist_image/episode_000000.mp4
- https://huggingface.co/datasets/IPEC-COMMUNITY/libero_90_no_noops_lerobot/resolve/main/meta/tasks.jsonl and .../meta/episodes.jsonl
- https://huggingface.co/api/datasets/nvidia/LIBERO_LeRobot_v3/tree/main/libero_90/videos/observation.images.image/chunk-000 (shard sizes)

## 6. mimicgen (MimicGen, arXiv 2310.17596)

Repo found: amandlek/mimicgen_datasets, API 200, gated false, licence cc-by-4.0. Folders source/ (12 files, human demos), core/ (26), object/ (2), robot/ (16), large_interpolation/ (6): 62 HDF5 files in robomimic structure, no mp4, no parquet, no rows API.
Method: HDF5 only, so media null; the full file list with byte sizes is recorded in [mimicgen/provenance_rows.json](mimicgen/provenance_rows.json) (one annotation-only entry per folder, plus the card summary: 120 source demos, 26,000 core, 2,000 object, 16,000 robot, 6,000 large_interpolation).
HTTP codes: tree 200 for every folder, README 307 then 200. No failures.
Files: none (media null).
URLs: https://huggingface.co/api/datasets/amandlek/mimicgen_datasets/tree/main/core (and /source, /object, /robot, /large_interpolation); https://huggingface.co/datasets/amandlek/mimicgen_datasets/resolve/main/README.md
