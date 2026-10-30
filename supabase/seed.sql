-- Publicly visible reference leads based on the project brief.
-- These are source records and directory leads, not uploaded attachments or independently verified operations.

insert into public.research_sources (id, title, publisher, source_type, url, publication_date, description, findings, category, verification_status, visibility)
values
('10000000-0000-4000-8000-000000000001','NPCB EIACP Newsletter · Vol. 9, Issue 4','Nagaland Pollution Control Board (NPCB)','Official publication','https://npcb.nagaland.gov.in/wp-content/uploads/EIACP-Newsletter-Vol-9-Issue-No-4-Oct-Dec-2025.pdf','Oct–Dec 2025','The newsletter labels the FY 2023–24 and FY 2024–25 figures as “Total Quantity of E-Waste collected”. The original publication should be retained for verification.','Reported quantities: 4.76207 MT for FY 2023–24 and 15.61187 MT for FY 2024–25.','generation','Pending verification','public'),
('10000000-0000-4000-8000-000000000002','CPCB report filed before the National Green Tribunal','Central Pollution Control Board (CPCB)','Government report','https://www.greentribunal.gov.in/sites/default/files/news_updates/Report%20on%20behalf%20of%20CPCB%20in%20EA%20NO%2004%20of%202024%20IN%20OA%20No.%20512%20of%202018%20%28Shailesh%20Singh%20Vs.%20State%20of%20U.P.%20%26%20Ors.%29.pdf',null,'The same values appear in a CPCB report table using generation terminology. Reconcile with NPCB before defining a generation or collection rate.','The terminology is not aligned with the NPCB newsletter.','generation','Pending verification','public'),
('10000000-0000-4000-8000-000000000003','State-wise registered recycler table','MoEFCC / Press Information Bureau','Government publication','https://www.pib.gov.in/PressReleasePage.aspx?PRID=2147876&lang=2&reg=48','2025','The cited state-wise table for FY 2023–24 and FY 2024–25 does not list Nagaland. This is a narrow table-specific finding, not proof that no collection or out-of-state treatment routes exist.','Nagaland is not listed in the cited state-wise registered recycler table.','recycling','Pending verification','public'),
('10000000-0000-4000-8000-000000000004','MEPL e-waste collection directory','MEPL / E-Circle listing','Industry directory','https://mepl.store/pages/e-waste',null,'Lists a Dimapur “Own Collection Centre”. Directory listing does not independently establish current operating status or recycler authorisation.','House 93, C Khel, Diphupara, Dimapur, Nagaland 797001. Listed contact: Soweteu K. Letro, 7005811236; contact@ecircle2018.com.','collection','Pending verification','public'),
('10000000-0000-4000-8000-000000000005','Think Recycling EPR / collection directory','Think Recycling','Industry directory','https://www.thinkrecycling.in/epr',null,'Lists collection connections in Kohima and Dimapur. These entries should be verified before directing bulk waste.','Kohima: H-90, Civil Secretariat. Dimapur: Plot-1, Industrial Area, Circular Road. Listed helpline: 1800-572-1009.','collection','Pending verification','public')
on conflict (id) do update set
  title = excluded.title, publisher = excluded.publisher, source_type = excluded.source_type, url = excluded.url,
  publication_date = excluded.publication_date, description = excluded.description, findings = excluded.findings,
  category = excluded.category, verification_status = excluded.verification_status, visibility = excluded.visibility;

insert into public.organisations (id, name, organisation_type, location, address, contact_name, phone, email, website, description, verification_status, visibility)
values
('20000000-0000-4000-8000-000000000001','MEPL / E-Circle','Directory-listed collection connection','Dimapur','House 93, C Khel, Diphupara, Dimapur, Nagaland 797001','Soweteu K. Letro','7005811236','contact@ecircle2018.com','https://mepl.store/pages/e-waste','MEPL’s e-waste page lists an “Own Collection Centre” in Dimapur. Operating status and downstream route require independent verification.','Pending verification','public'),
('20000000-0000-4000-8000-000000000002','Think Recycling','Directory-listed collection connection','Kohima','H-90, Civil Secretariat, Kohima, Nagaland 797004',null,'1800-572-1009',null,'https://www.thinkrecycling.in/epr','A Kohima collection point is listed in the Think Recycling EPR directory. Current operating status and accepted categories are not independently verified.','Pending verification','public'),
('20000000-0000-4000-8000-000000000003','Think Recycling','Directory-listed collection connection','Dimapur','Plot-1, Industrial Area, Circular Road, Dimapur, Nagaland 797112',null,'1800-572-1009',null,'https://www.thinkrecycling.in/epr','A Dimapur collection point is listed in the Think Recycling EPR directory. Current operating status and accepted categories are not independently verified.','Pending verification','public')
on conflict (id) do update set
  name=excluded.name, organisation_type=excluded.organisation_type, location=excluded.location, address=excluded.address,
  contact_name=excluded.contact_name, phone=excluded.phone, email=excluded.email, website=excluded.website,
  description=excluded.description, verification_status=excluded.verification_status, visibility=excluded.visibility;

insert into public.deliverables (id, title, description, status, visibility)
values
('30000000-0000-4000-8000-000000000001','State-wise e-waste tracker','Proposed deliverable. No file attached yet.','Not started','public'),
('30000000-0000-4000-8000-000000000002','E-waste scorecard','Proposed deliverable. No file attached yet.','Not started','public'),
('30000000-0000-4000-8000-000000000003','Company directory','Proposed deliverable. No file attached yet.','Not started','public'),
('30000000-0000-4000-8000-000000000004','Research report','Proposed deliverable. No file attached yet.','Not started','public'),
('30000000-0000-4000-8000-000000000005','Excel workbooks','Proposed deliverable. No file attached yet.','Not started','public'),
('30000000-0000-4000-8000-000000000006','Presentations','Proposed deliverable. No file attached yet.','Not started','public'),
('30000000-0000-4000-8000-000000000007','Documentation','Proposed deliverable. No file attached yet.','Not started','public'),
('30000000-0000-4000-8000-000000000008','Final submission','Proposed deliverable. No file attached yet.','Not started','public'),
('30000000-0000-4000-8000-000000000009','Supporting material','Proposed deliverable. No file attached yet.','Not started','public')
on conflict (id) do update set title=excluded.title, description=excluded.description, status=excluded.status, visibility=excluded.visibility;
