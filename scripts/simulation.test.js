'use strict'

const { parseCSV, cleanProperties, cleanTrips, compileTrips, reintroduceTips } = require('/UberAnal/scripts/process-files.js')
const { simulation, Block } = require('/UberAnal/scripts/simulation.new.js');

const testCSV = `Driver Name,Phone Number,Email,Date/Time,Trip ID,Type,Fare Base,Fare Distance,Fare Minimum Fare Supplement,Fare Long Pickup Distance,Fare Long Pickup Time,Fare Surge,Fare Time,Fare Wait Time,Promotion Quest,Tip,Total
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 9:06 PM","8e829120-45e5-49c3-b2e2-3c5397f6c7dc","UberX","$0.78","$1.38","$0.39","","","","$1.11","$0.05","","","$3.71"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 1:28 AM","806e7178-f018-42be-85f8-04da2d13783e","UberX","$0.78","$6.72","","","","$9.91","$4.08","","","","$21.49"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 2:19 AM","e3271127-012a-4ef7-a9a0-e3db42e7573c","UberX","$0.78","$2.10","","","","","$1.40","","","","$4.28"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 3:19 AM","380872fd-69d7-4473-821b-a8fe556d5358","UberX","$0.78","$3.72","","$5.10","$1.67","","$1.59","","","$5.00","$17.86"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 10:19 PM","85fd4aea-46e2-407c-aa91-0e12e97b37e2","UberX","$0.78","$1.96","","","","","$0.93","","","","$3.67"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 10:06 PM","72ad7d2c-0a7a-488c-b18f-fc0fb1deb919","UberX","$0.78","$1.11","$0.77","","","","$1.00","$0.34","","","$4.00"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 11:29 PM","911b7685-be63-4d91-ba58-92ed822a4ec7","UberX","$0.78","$3.03","","","","","$2.48","","","","$6.29"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 12:43 AM","ca89bbba-39e0-4747-b5b9-40811fa140d0","UberX","$0.78","$1.43","$0.29","","","","$1.17","","","","$3.67"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 9:51 PM","dc76864d-be30-42b9-95c5-26de1c810d54","UberX","$0.78","$3.30","","","","","$1.72","","","","$5.80"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 8:46 PM","15e0cb05-3ad4-4772-a3fd-ec85835d86c0","UberX","$0.78","$5.30","","$0.43","$0.23","","$2.37","","","","$9.11"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 10:34 PM","f13f5503-08d5-48e8-8e0c-175b357645a4","UberX","$0.78","$6.81","","$0.05","$0.06","","$3.22","$0.52","","$5.00","$16.44"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 9:29 PM","eea392ae-36b5-4c4b-aa07-d9deb2d0dcac","UberX","$0.78","$3.38","","","","","$1.50","","","","$5.66"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 10:42 PM","bc54511b-11d6-416c-ba14-bf11176b8d65","UberX","$0.78","$2.04","","$3.73","$1.69","","$1.07","$0.01","","","$9.32"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 10:13 PM","d1e4e938-53b2-4bb4-84b1-213c211bf8a4","UberX","$0.78","$1.73","","$0.28","$0.19","","$0.99","","","","$3.97"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 10:18 PM","908b1ba4-1217-42c5-a85c-b48b2b28cd74","UberX","$0.78","$2.38","","","","","$1.58","","","","$4.74"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 1:09 AM","bbff2387-04d6-482c-a697-951adcddd906","UberX","$0.78","$1.45","","","","$7.20","$1.47","","","$4.23","$15.13"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 11:34 PM","d2849e67-5ae6-4b06-a21d-b28214ddcbc4","UberX","$0.78","$3.00","","","","","$1.67","","","","$5.45"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 10:00 PM","8e91f280-7276-456c-8499-92e1ab9bd208","UberX","$0.78","$3.18","","","","","$1.48","","","$2.00","$7.44"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 12:57 AM","b4c7ea0b-459c-4f2a-b458-d1303b140cac","UberX","$0.78","$1.43","$0.34","","","$1.75","$1.11","","","","$5.41"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 10:11 PM","0893d6fe-a9c7-4e0b-8dff-5d48db789b7c","UberX","$0.78","$0.79","$1.27","","","","$0.83","","","","$3.67"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 11:53 PM","f3741327-9d37-4093-9ee1-c6ceed2ef2d5","UberX","$0.78","$1.45","$0.15","","","","$1.28","$0.03","","","$3.69"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 11:55 PM","94561522-3fd2-4ec6-a2e4-9c5c176f57e7","UberX","$0.78","$3.58","","","","","$2.14","$0.07","","","$6.57"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 11:59 PM","057a0918-f74b-46ea-9865-3a8027047e73","UberX","$0.78","$1.88","","","","","$1.28","","","$3.00","$6.94"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 9:13 PM","f37dfd17-0761-4323-9f4b-3372a7fe6a10","UberX","$0.78","$5.22","","","","","$1.83","","","$3.00","$10.83"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 2:03 AM","7d237fbb-11af-4bab-b23a-22ae43e1068a","UberX","$0.78","$4.94","","","","","$2.10","","","","$7.82"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 8:25 PM","1774536b-5d2e-4200-8771-775eba224b92","UberX","$0.78","$2.94","","","","","$1.78","","","","$5.50"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 12:19 AM","534838ff-5656-4eb8-b84d-9fdc6b6b2b07","UberX","$0.78","$2.27","","","","","$1.49","$1.22","","","$5.76"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 7:52 PM","6d057803-2e0c-4e23-bc4e-cc65ca896173","UberX","$0.78","$10.92","","","","","$3.80","","","$5.36","$20.86"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 10:30 PM","d5003b0c-5654-4cc0-9c28-ee83f8ba90cc","UberX","$0.78","$1.32","$0.63","","","","$0.93","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 8:52 PM","3d1a87e6-a63c-44c3-a30e-99186b114a9e","UberX","$0.78","$1.33","","","","","$2.24","$0.36","","","$4.71"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 8:28 PM","4a3d0b43-fe63-4c1c-b54d-7c83ffa5371d","UberX","$0.78","$3.56","","","","","$1.36","","","","$5.70"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 12:24 AM","c02c7747-f1c2-4159-a64a-b8899989fad5","UberX","$0.78","$1.22","$0.83","","","","$0.83","$0.67","","","$4.33"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 3:39 AM","6682b6f8-f7c4-4cad-b8a6-1e8c9fa2e91f","UberX","$0.78","$3.09","","$1.49","$0.72","","$1.99","","","","$8.07"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 2:44 AM","8efd9760-213b-44a9-8273-fbf06c474e85","UberX","$0.78","$2.88","","","","","$1.37","$0.01","","","$5.04"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 9:12 PM","06e69c36-b929-4358-9482-540017f0a59c","UberX","$0.78","$2.14","","","","","$2.79","$0.07","","","$5.78"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 9:37 PM","d4105cdc-a55a-45ef-85eb-ce2aa3ca72ea","UberX","$0.78","$2.98","","","","","$1.40","","","","$5.16"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 10:05 PM","a5101f8f-dc49-4f82-9f94-b49715573359","UberX","$0.78","$2.83","","","","","$1.30","","","","$4.91"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 11:08 PM","9b22fe23-f1e3-4256-adcd-b57670484b41","UberX","$0.78","$2.94","","","","","$1.54","","","","$5.26"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 2:43 AM","e46121d4-8573-4799-abc4-e3a74d9b06ae","UberX","$0.78","$3.66","","","","$3.75","$1.63","","","","$9.82"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 11:54 PM","c7b5dea0-65ff-419f-822e-fbc6a39de9df","UberX","$0.78","$8.15","","","","$3.25","$2.32","$0.81","","","$15.31"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 10:52 PM","59a0d592-6fda-49c2-a1fd-f0a03240f6e7","UberX","$0.78","$4.96","","","","","$2.20","$0.66","","","$8.60"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 8:28 PM","fb7f278f-72b8-41cf-99aa-d07427eff94b","UberX","$0.78","$1.64","$0.49","","","","$0.75","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 9:57 PM","3c9f8577-64a6-4b1e-a290-ce6668340a3e","UberX","$0.78","$1.43","$0.33","","","","$1.12","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 2, 2021 8:53 PM","5174474a-65ad-4ab3-b08b-48e30b3f648e","UberX","$0.78","$1.33","$0.09","","","","$1.46","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 9:45 PM","1c09f6ed-feec-4f36-9d18-03e928d629cd","UberX","$0.78","$2.46","","","","","$1.27","","","","$4.51"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 4, 2021 11:35 PM","06adc276-3524-4d41-96ec-f3b572de058b","UberX","$0.78","$3.55","","","","","$2.12","","","","$6.45"
"Justin Munger","","justinmunger027@yahoo.com","Thursday, June 3, 2021 11:19 PM","6224215f-bcba-4142-96f3-a4d336b0c0ed","UberX","$0.78","$1.14","$0.76","","","","$0.98","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 3:12 AM","59ac2001-1b46-4eb0-a6f6-44cc7c7b6c12","UberX","$0.78","","$1.59","$0.04","","","$2.25","$1.25","","","","","$5.91"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 2:05 AM","b3167ed7-6fce-44a3-a314-64b54e1beb06","UberX","$0.78","","$3.47","","","","$19.33","$1.81","","","","","$25.39"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 9:21 PM","6cf07d59-da00-4ed4-8941-8f757b693d6b","UberX","$0.78","","$3.46","","","","$3.25","$1.69","","","","","$9.18"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 2:45 AM","30fec2e0-3c40-4c4b-a5c3-3d30294d4f47","UberX","$0.78","","$1.11","$0.78","","","","$0.99","","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 7:43 PM","fb3497b0-40a8-4802-bd44-7e0fd487230d","UberX","$0.78","","$3.88","","","","","$1.75","","","","","$6.41"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 1:14 AM","e73c35a1-67f1-4d53-9a55-5dc622bce027","UberX","$0.78","","$1.57","$0.17","","","$6.81","$1.14","","","","","$10.47"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 11:41 PM","eb0d3c1d-8603-4cb0-9ec6-c8f79a50e6dd","UberX","$0.78","","$1.35","$0.04","$0.38","$0.22","","$0.89","","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 11:47 PM","745ddea2-388e-48b4-a4d1-6295be26c1eb","UberX","$0.78","","$4.32","","","","","$1.83","","","$5.00","","$11.93"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 4:30 AM","2542df05-c336-4851-9923-24bdb0ccf892","UberX","$0.78","","$6.33","","$0.51","$0.50","$2.25","$2.76","","","","","$13.13"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 2:27 AM","f24832bf-168d-48e6-9103-ccb6a9c5413e","UberX","$0.78","","$3.65","","$0.17","$0.11","$2.75","$2.25","","","","","$9.71"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 10:15 PM","ae20de7f-a7fc-4a69-a32b-c4369283c051","UberX","$0.78","","$2.07","","$0.12","$0.06","$2.25","$1.48","","","$3.00","","$9.76"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 9:01 PM","75b965e0-76d9-49fc-9ede-f469c56c22de","UberX","$0.78","","$4.34","","","","","$2.30","","","","","$7.42"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 12:17 AM","e0366542-6a19-4530-bd97-2ed610a37d84","UberX","$0.78","","$1.24","","$3.06","$0.84","","$0.52","$0.11","","","","$6.55"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 1:35 AM","a5e4a62c-fa01-4df2-b644-eb505dbf49aa","UberX","$0.78","","$1.63","$0.03","","","$14.01","$1.22","","","","","$17.67"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 11:16 PM","19a0f4cc-e5fa-4cc2-888a-6f80b50669ac","UberX","","$3.83","","","","","","","","","","","$3.83"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 1:04 AM","459d4396-7c3f-4a49-b93e-47908b77cf4f","UberX","$0.78","","$1.69","","","","$2.50","$1.44","$0.01","","","","$6.42"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 3:19 AM","9e53740a-476b-4ebc-bee7-64ac66d7a39e","UberX","$0.78","","$3.55","","","","$2.50","$2.41","","","","","$9.24"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 3:43 AM","fdc01f14-21cf-4038-a6f1-0ef5ad970236","UberX","$0.78","","$7.62","","$1.17","$0.57","","$3.16","","","$1.00","","$14.30"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 12:38 AM","016ec3b6-6267-4486-9a69-b4fa21acea43","UberX","$0.78","","$0.59","$1.75","","","","$0.54","","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 8:38 PM","7e40709d-9324-47f9-ac94-4cda62d7ef9d","UberX","$0.78","","$0.76","$1.17","","","","$0.95","","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 8:42 PM","36edb19d-4072-42f4-9bd9-38c3468b352e","UberX","$0.78","","$2.79","","","","","$1.12","","","","","$4.69"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 10:46 PM","030d11e5-42d4-47c3-b762-bbc5cba4e5f7","UberX","$0.78","","$5.43","","$0.06","$0.07","$3.00","$3.86","$0.05","","","","$13.25"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 12:50 AM","dc0b32d5-c28a-433c-b758-b2c4fb221448","UberX","$0.78","","$1.59","$0.09","","","$4.50","$1.20","","","","","$8.16"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 10:00 PM","4590b5bd-0e3c-4aa1-9c31-0bd13a09b5e7","UberX","$0.78","","$2.67","","","","$4.00","$1.51","","","","","$8.96"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 10:01 PM","437e50aa-e055-45ea-b464-0c1dab65468b","UberX","$0.78","","$3.22","","","","$5.49","$2.04","$0.39","","","","$11.92"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 1:42 AM","3dedebf7-18b7-47b4-b756-35cbfd690e60","UberX","$0.78","","$4.97","","","","$3.00","$2.10","$0.13","","","","$10.98"
"Justin Munger","","justinmunger027@yahoo.com","Saturday, June 5, 2021 8:07 PM","077277b4-35c1-4765-b66a-41f494ff6d4f","UberX","$0.78","","$8.95","","","","","$2.58","$0.50","","$3.15","","$15.96"
"Justin Munger","","justinmunger027@yahoo.com","Monday, June 7, 2021 1:02 AM","b237f3f0-9a15-42ed-af7f-e6642b63b3e3","UberX","$0.78","","$2.31","","","","$3.00","$1.87","$0.64","","","","$8.60"
"Justin Munger","","justinmunger027@yahoo.com","Monday, June 7, 2021 1:17 AM","3d2e4ab4-e005-4068-aa0b-52588a77d6ca","UberX","$0.78","","$2.73","","","","","$1.85","","","$5.00","","$10.36"
"Justin Munger","","justinmunger027@yahoo.com","Monday, June 7, 2021 12:25 AM","8f29ef8f-a4fc-4401-8f1a-0c83505907ff","UberX","$0.78","","$2.65","","","","","$1.29","","","$5.00","","$9.72"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 11:05 PM","3517a007-2caf-4857-982e-a816b49c7822","UberX","$0.78","","$2.12","","","","","$1.45","","","","","$4.35"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 10:17 PM","567a4948-b1e6-437a-b5d7-53475f0bf55e","UberX","$0.78","","$3.40","","","","$1.75","$1.38","","","","","$7.31"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 11:23 PM","ab5d3ce8-23a9-43e3-b104-840c9ccb2a6a","UberX","$0.78","","$1.83","","","","","$1.23","","","","","$3.84"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 7:49 PM","d6cba188-817b-4055-967e-afc0162db4ad","UberX","$0.78","","$4.23","","","","","$2.10","$0.14","","","","$7.25"
"Justin Munger","","justinmunger027@yahoo.com","Monday, June 7, 2021 2:31 AM","773fbf30-4786-4a60-868b-97714f15d26c","UberX","$0.78","","$2.90","","","","$1.75","$1.21","$0.40","","","","$7.04"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 8:27 PM","2835b1ba-59fa-4d04-9700-c37b0dd7d3f6","UberX","$0.78","","$1.98","","","","","$1.41","","","","","$4.17"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 9:05 PM","41290c3f-8dee-4277-9c4f-2b1e8af183a6","UberX","$0.78","","$5.28","","","","$1.25","$2.28","","","","","$9.59"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 9:30 PM","5db02d81-2b7a-4a64-9fef-4fbfd690a04f","UberX","$0.78","","$1.11","$0.94","","","$8.48","$0.83","","","","","$12.14"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 8:12 PM","08dece34-2018-482d-a062-61f3fc267e6b","UberX","$0.78","","$1.17","$0.94","","","$1.25","$0.77","","","$1.00","","$5.91"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 9:46 PM","7504997b-eb57-4f5a-9bca-96f3c52a639e","UberX","$0.78","","$8.37","","$1.08","$1.19","","$3.81","","","$3.14","","$18.37"
"Justin Munger","","justinmunger027@yahoo.com","Monday, June 7, 2021 12:40 AM","b2831c00-15a6-4418-8d14-25d0aad105eb","UberX","$0.78","","$4.11","","","","","$1.60","","","$1.00","","$7.49"
"Justin Munger","","justinmunger027@yahoo.com","Monday, June 7, 2021 1:59 AM","48056f50-1b13-4d0d-8251-87a9f32291d7","UberX","$0.78","","$2.19","","","","","$1.82","","","","","$4.79"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 11:56 PM","9a31bb3a-5d74-413d-ba4a-891b887752de","UberX","$0.78","","$1.87","","$1.72","$0.95","$1.25","$1.53","","","","","$8.10"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 11:39 PM","ba19df76-8770-4047-96ae-41b99aaad6ba","UberX","$0.78","","$1.27","","$0.83","$0.25","","$0.91","","","","","$4.04"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 9:04 PM","7c6452da-5c25-4ea6-85ef-f6add4eacad8","UberX","$0.78","","$4.44","","","","$7.50","$1.95","$0.03","","$3.00","","$17.70"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 10:25 PM","7ee8bc65-f41d-4419-b279-5a07e26405a2","UberX","","$4.31","","","","","","","","","","","$4.31"
"Justin Munger","","justinmunger027@yahoo.com","Monday, June 7, 2021 1:37 AM","12ae5fc9-a783-4491-8bf5-a4b35282fc3b","UberX","$0.78","","$1.85","","$1.66","$0.87","$2.25","$1.12","","","","","$8.53"
"Justin Munger","","justinmunger027@yahoo.com","Sunday, June 6, 2021 11:11 PM","f4ea8b9f-a559-4a43-b659-5689ecf10fc4","UberX","$0.78","","$2.23","","","","","$1.21","","","","","$4.22"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 8:37 PM","06a2de69-8d75-46b1-a03e-5e27a4055a0a","UberX","$0.78","","$6.06","","","$3.56","","","","$10.40"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 8:07 PM","61e36f95-3370-4666-ae75-efce5d375114","UberX","$0.78","","$5.71","","","$1.97","","","","$8.46"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 10:44 PM","06676195-7790-4b9d-a133-012207da337f","UberX","$0.78","","$4.81","","","$2.39","","","","$7.98"
"Justin Munger","","justinmunger027@yahoo.com","Monday, June 7, 2021 1:37 AM","12ae5fc9-a783-4491-8bf5-a4b35282fc3b","UberX","","","","","","","","$1.00","","$1.00"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 10:10 PM","11610a66-43f7-4214-b088-1a17305fedea","UberX","","$10.93","","","","","$0.39","","","$11.32"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 11:19 PM","33afc9ef-f420-4e33-a2cc-e6e404734bc8","UberX","$0.78","","$10.92","$0.42","$0.29","$3.28","","","","$15.69"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 11:41 PM","f2b40b91-5247-40b3-80fe-f1b3bb0a59e1","UberX","$0.78","","$14.19","","","$4.33","$0.29","","","$19.59"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 9:05 PM","10a7373b-4794-44da-9cdf-75bf6130f873","UberX","$0.78","","$3.32","","","$1.82","$1.61","","","$7.53"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 12:09 AM","319890dd-7712-4ca5-a958-103ad69b1a45","UberX","","$9.16","","","","","","","","$9.16"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 10:25 PM","7c7ff87d-5895-4b29-b651-69317f272b8a","UberX","$0.78","","$2.15","","","$1.07","$0.02","","","$4.02"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 9:33 PM","5a4c2625-ce6a-449f-9059-811c4ff8cfa2","UberX","$0.78","","$3.46","","","$2.06","","","","$6.30"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 8:09 PM","48702ccb-9cb9-416d-ad84-31f834813e06","UberX","$0.78","$6.20","","","$1.63","$3.00","","","$11.61"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 9:10 PM","e9bcc09e-ef1e-414f-b1ee-0aff5bb40242","UberX","$0.78","$1.99","","","$1.47","","","","$4.24"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 10:05 PM","32d889a7-24ff-4b1c-b5cc-bf1c6e53d404","UberX","$0.78","$8.28","","","$3.16","","","","$12.22"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 8:59 PM","f2668204-6b98-448c-b56d-169277bf4445","UberX","$0.78","$2.73","","","$1.09","","","","$4.60"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 9:27 PM","b3e79fdd-b981-4cdf-ba63-4e4d37f63e5c","UberX","$0.78","$4.12","","","$1.69","","","","$6.59"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 11:15 PM","595d055e-d863-4550-8e9a-7ca26b555472","UberX","$0.78","$4.59","$1.54","$0.63","$2.22","","","","$9.76"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 10:23 PM","119914e1-f772-487c-81d1-90d638e1e7ec","UberX","$0.78","$3.33","","","$1.67","","","","$5.78"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 10:50 PM","a2049a88-80f9-45f2-af88-6ae40736864c","UberX","$0.78","$2.46","","","$1.02","$3.00","$0.04","","$7.30"
"Justin Munger","","justinmunger027@yahoo.com","Tuesday, June 8, 2021 11:19 PM","33afc9ef-f420-4e33-a2cc-e6e404734bc8","UberX","","","","","","$3.85","","","$3.85"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 8:32 PM","acb4bf01-ef4a-41db-b251-2be787a6b772","UberX","$0.78","$6.00","$1.83","$0.63","$1.79","","","","$11.03"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 11:35 PM","24f475cc-3c18-45f8-aa3c-3555d9e36572","UberX","$0.78","$3.53","","","$1.41","$1.00","","","$6.72"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 11, 2021 9:21 PM","0789203f-c84b-4479-ae46-a513f811b4b5","UberX","$0.78","$1.19","$0.47","$1.21","","","","$3.65"
"Justin Munger","","justinmunger027@yahoo.com","Wednesday, June 9, 2021 11:15 PM","595d055e-d863-4550-8e9a-7ca26b555472","UberX","","","","","","$1.00","","$1.00"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 11, 2021 8:06 PM","733a873e-0a06-4b51-937b-d8e833ee9f78","UberX","$0.78","$3.38","","$1.72","$0.12","","","$6.00"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 11, 2021 8:39 PM","3b10e685-c79a-4af6-a158-36d77ef7598d","UberX","$0.78","$2.13","","$1.65","","","","$4.56"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 11, 2021 8:53 PM","e36e02e4-81fb-4c8f-aabe-5e2a7f3dadca","UberX","$0.78","$0.69","$1.49","$0.70","","","","$3.66"
"Justin Munger","","justinmunger027@yahoo.com","Friday, June 11, 2021 9:02 PM","569ef751-14d7-49e6-9148-23023d46596b","UberX","$0.78","$1.73","","$1.30","","","","$3.81"
`
const testData = reintroduceTips(compileTrips([cleanTrips(cleanProperties(parseCSV(testCSV)))]));
const blocks = simulation(testData);


test('check if jest is working', () => {
    expect(true).toBe(true)
})
test('check if test data built correctly', () => {
    expect(Array.isArray(testData)).toBe(true)
})

test('verify minmax stuff', () => {
    for (const block of blocks) {
        const hack = [block.model.max, block.model.min]
        for (const mm of hack) {
            // this test will fail if the test data contains trip types with higher long pickup thresholds than UberX
            expect(mm.averagePickup).toBeLessThanOrEqual(600);
            expect(mm.averageWait).toBeLessThanOrEqual(120);
            expect(mm.baseUnaccountedTime).toBeLessThanOrEqual(mm.unpaidTime);
            expect(mm.unaccountedTime).toBeLessThanOrEqual(mm.baseUnaccountedTime);
            expect(mm.unpaidPickup).toBeLessThanOrEqual(mm.unaccountedTime);
            expect(mm.unpaidWait).toBeLessThanOrEqual(mm.unaccountedTime);
        }
    }
})
