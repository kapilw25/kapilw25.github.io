# Assets for the state-change cliff pages (read 2026-10-02)

| 📦 file | 🔎 what | 🏷️ source | ⚖️ licence |
|---|---|---|---|
| SM_Forklift_C01_Blue_01.glb, sm_largecardboardboxe_a02_01.glb, SM_Container_C04_Gray_01.glb, SM_Rack_F04_01.glb, RackLargeEmpty_A1.glb, RackLongEmpty_A1.glb, Cardbox_A1.glb, SM_Case_A01_Glossy_B_01.glb, Pallet_A1.glb, FlatBox_A05_26x26x11cm_PR_NVD_01.glb, sm_rackspecificationtable_a01_01.glb | forklift, heavy strapped load on a pallet, storage bin, 3-shelf unit, pallet racks, cardboard box, steel case, pallet, small box, rack load sign | NVIDIA, [PhysicalAI-SimReady-Warehouse-01](https://huggingface.co/datasets/nvidia/PhysicalAI-SimReady-Warehouse-01) v1.1.0 (USD), converted to glTF by us (meshes simplified, textures resized) | CC BY 4.0 |
| empty_warehouse_01_1k.hdr | lighting (image-based) | Sergej Majboroda, [Poly Haven](https://polyhaven.com/a/empty_warehouse_01) | CC0 |
| concrete_floor_painted_*.webp | floor texture | Rob Tuytel, [Poly Haven](https://polyhaven.com/a/concrete_floor_painted) | CC0 |
| sticker_hazard_ghs07.svg | hazard sticker (GHS07 exclamation mark) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:GHS-pictogram-exclam.svg), UN GHS | public domain |
| sticker_fragile_iso7000_0621.svg | fragile sticker (ISO 7000-0621) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ISO_7000_-_Ref-No_0621.svg), vectorised by Mrmw | public domain |
| sticker_keepdry_iso7000_0626.svg | keep dry sticker (ISO 7000-0626) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ISO_7000_-_Ref-No_0626.svg) | public domain |
| sticker_thiswayup_iso7000_0623.svg | this way up sticker (ISO 7000-0623) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ISO_7000_-_Ref-No_0623.svg) | CC0 |

Drawn by the page code (no outside source): the robot arms, the AGV, the tool chest, the solid-walled bins, the
painted sticker boxes, barcode labels, the work table and the stretch wrap. The ISO symbols' grey corner marks were
removed. Conversion script: scratch `convert_usd.py` (USD to glTF), then `gltf-transform optimize` (meshopt, WebP).
