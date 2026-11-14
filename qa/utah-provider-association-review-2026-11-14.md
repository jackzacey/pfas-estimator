# Utah provider-association handling

Implemented November 14, 2026 following internal QC of 30 EPA-listed Utah ZIP codes. This is not Utah DDW or provider approval.

The raw EPA lookup, concentrations, location averages and monitoring periods remain unchanged. A separate presentation overlay controls which associations appear in a ZIP's normal provider cards and assistant context.

| ZIP | PWSID | Presentation |
| --- | --- | --- |
| 84102 | UTAH18027, Jordan Valley WCD | Pending association; excluded from normal ZIP cards and concentration/assistant summaries. |
| 84010 | UTAH18026, Salt Lake City | Pending association; excluded from normal ZIP cards and concentration/assistant summaries. |
| 84088 | UTAH18027 | Separate possible upstream wholesale supplier; concentrations excluded from ZIP summary and assistant inputs. |
| 84065 | UTAH18027 | Separate possible upstream wholesale supplier; concentrations excluded from ZIP summary and assistant inputs. |
| 84119 | UTAH18027 | Candidate retained with a mixed retail/wholesale warning and matching assistant-context caution. |

All system records remain accessible by explicit PWSID selection. A direct system selection does not establish service to a home. Pending and wholesale sections contain names/IDs and direct links, not concentration summaries.

## Evidence and limits

Internal screening queried active Utah service areas using exact DWSYSNUM/PWSID matches and the UGRC approximate ZIP polygons. Geometry intersections were calculated in EPSG:26912. Native geometry-area controls passed. This supports candidate screening, not household assignment.

- Jordan Valley / 84088 and 84065: no mapped retail overlap, but mapped wholesale overlap.
- Jordan Valley / 84119: both mapped retail and wholesale overlap.
- Jordan Valley / 84102: neither mapped retail nor wholesale overlap.
- Salt Lake City / 84010: 16.95 square meters of mapped retail overlap. This is flagged as a likely boundary sliver, not a definitive finding that no service relationship exists.

Sources retrieved November 13, 2026:

- https://gis.utah.gov/products/sgid/utilities/retail-culinary-water/
- https://gis.utah.gov/products/sgid/boundaries/zip-codes/
- https://services.arcgis.com/ZzrwjTRez6FJiOq4/ArcGIS/rest/services/WholesaleCulinaryWaterSuppliers/FeatureServer
- https://jvwcd.gov/about
- https://www.bountiful.gov/210/Water

Utah/provider confirmation of the classifications remains open. No automatic removal based solely on state, ZIP centroid, or a tiny polygon overlap was applied.
