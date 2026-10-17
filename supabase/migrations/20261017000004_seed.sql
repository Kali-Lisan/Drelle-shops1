-- Seed: settings, pages, brands, categories, and the Drelle Shops price list.
insert into store_settings (id, whatsapp_number) values (1, '233531808823') on conflict (id) do nothing;

insert into store_pages (slug, title, body) values
 ('shipping','Delivery','Delivery arrangements and timing are agreed with you on WhatsApp when your order is confirmed.'),
 ('returns','Returns','Please contact us on WhatsApp about any issue with your order. Edit this page in Admin > Store Settings.'),
 ('privacy','Privacy','We only collect the contact details you provide when placing an order, and use them to fulfil that order.'),
 ('terms','Terms','Orders placed on this site are requests that become confirmed only after Drelle Shops confirms them with you on WhatsApp.')
on conflict do nothing;

insert into brands (name, slug, is_featured, sort_order) values
 ('Gucci','gucci',true,1),('Chanel','chanel',true,2),('Dior','dior',true,3),('Louis Vuitton','louis-vuitton',true,4),
 ('Prada','prada',false,5),('Coach','coach',true,6),('Swarovski','swarovski',true,7),('Pandora','pandora',false,8),
 ('Vivienne Westwood','vivienne-westwood',false,9),('Van Cleef & Arpels','van-cleef-arpels',false,10),
 ('Valentino','valentino',false,11),('Messika','messika',false,12),('Tiffany & Co.','tiffany-co',false,13),
 ('APM Monaco','apm-monaco',false,14),('BVLGARI','bvlgari',false,15),('Hermès','hermes',false,16),
 ('Tory Burch','tory-burch',false,17),('Miu Miu','miu-miu',false,18),('Pucci','pucci',false,19),
 ('Alo','alo',false,20),('SKIMS','skims',false,21),('Super','super',false,22),('Hidden Cult','hidden-cult',false,23),
 ('Munch','munch',false,24),('Dolce & Gabbana','dolce-gabbana',false,25);

insert into categories (name, slug, sort_order) values
 ('Jewelry','jewelry',1),('Bags','bags',2),('Accessories','accessories',3),('Shoes','shoes',4),
 ('Watches','watches',5),('Apparel','apparel',6),('Swimwear','swimwear',7);
insert into categories (name, slug, parent_id, sort_order)
select s.name, s.slug, c.id, s.ord from (values
 ('Earrings','earrings','jewelry',1),('Necklaces','necklaces','jewelry',2),('Bracelets','bracelets','jewelry',3),
 ('Rings','rings','jewelry',4),('Charms','charms','jewelry',5),('Sets','sets','apparel',1),('Bikinis','bikinis','swimwear',1)
) as s(name, slug, parent, ord) join categories c on c.slug = s.parent;

-- Prices are exactly as supplied. price NULL + price_on_request = "CS" in the source list.
-- Stock is NOT invented: seeded products have track_inventory = false until the admin sets quantities.
insert into products (name, slug, brand_id, category_id, subcategory_id, price, price_on_request, status, track_inventory, is_published, is_featured)
select v.name, v.slug, b.id, c.id, sc.id, v.price, v.price is null, 'available', false, true, v.feat
from (values
 ('Coach Necklace','coach-necklace','coach','jewelry','necklaces',350,false),
 ('Coach Bracelet','coach-bracelet','coach','jewelry','bracelets',350,false),
 ('Swarovski Necklace','swarovski-necklace','swarovski','jewelry','necklaces',450,true),
 ('Swarovski Bracelet','swarovski-bracelet','swarovski','jewelry','bracelets',450,false),
 ('Swarovski Earrings','swarovski-earrings','swarovski','jewelry','earrings',300,false),
 ('Vivienne Westwood','vivienne-westwood','vivienne-westwood','jewelry',null,300,false),
 ('Gucci Earrings','gucci-earrings','gucci','jewelry','earrings',250,true),
 ('Dior Earrings','dior-earrings','dior','jewelry','earrings',300,true),
 ('Chanel Earrings','chanel-earrings','chanel','jewelry','earrings',300,true),
 ('Pandora Necklace','pandora-necklace','pandora','jewelry','necklaces',350,false),
 ('Pandora Rings','pandora-rings','pandora','jewelry','rings',350,false),
 ('Pandora Charms','pandora-charms','pandora','jewelry','charms',450,false),
 ('Van Cleef Bracelet','van-cleef-bracelet','van-cleef-arpels','jewelry','bracelets',700,false),
 ('Van Cleef Necklace','van-cleef-necklace','van-cleef-arpels','jewelry','necklaces',650,false),
 ('Valentino Earrings','valentino-earrings','valentino','jewelry','earrings',300,false),
 ('Messika Bracelet','messika-bracelet','messika','jewelry','bracelets',450,false),
 ('Messika Ring','messika-ring','messika','jewelry','rings',450,false),
 ('Tiffany & Co.','tiffany-co','tiffany-co','jewelry',null,450,false),
 ('APM','apm','apm-monaco','jewelry',null,null,false),
 ('BVLGARI Watch & Bracelet','bvlgari-watch-bracelet','bvlgari','jewelry','bracelets',550,false),
 ('Hermès Bracelet','hermes-bracelet','hermes','jewelry','bracelets',450,false),
 ('Pig Necklace','pig-necklace',null,'jewelry','necklaces',450,false),
 ('Ariana Grande Swarovski Necklace','ariana-grande-swarovski-necklace','swarovski','jewelry','necklaces',550,false),
 ('Chanel Bag','chanel-bag','chanel','bags',null,700,true),
 ('Tory Burch Mini','tory-burch-mini','tory-burch','bags',null,400,false),
 ('Fish Purse','fish-purse',null,'bags',null,450,false),
 ('Miu Miu Glasses','miu-miu-glasses','miu-miu','accessories',null,250,false),
 ('Pucci Scarf','pucci-scarf','pucci','accessories',null,null,false),
 ('Alo Blue Set','alo-blue-set','alo','apparel','sets',700,false),
 ('Alo Black Set','alo-black-set','alo','apparel','sets',500,false),
 ('Milano','milano',null,'apparel',null,1300,false),
 ('SKIMS','skims','skims','apparel',null,null,false),
 ('Hidden Cult','hidden-cult','hidden-cult','apparel',null,null,false),
 ('Pucci Bikini','pucci-bikini','pucci','swimwear','bikinis',550,false),
 ('Super Bikini','super-bikini','super','swimwear','bikinis',null,false),
 ('Murci Bikini','murci-bikini','munch','swimwear','bikinis',null,false),
 ('Dolce and Gabbana Slippers','dolce-and-gabbana-slippers','dolce-gabbana','shoes',null,null,false)
) as v(name, slug, brand, cat, sub, price, feat)
left join brands b on b.slug = v.brand
join categories c on c.slug = v.cat
left join categories sc on sc.slug = v.sub;
