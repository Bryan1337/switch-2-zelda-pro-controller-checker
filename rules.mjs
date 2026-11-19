export function qualifies(r,s) {
 return /Nintendo Switch 2/i.test(r.title||'') && /Pro.?Controller/i.test(r.title||'') && /Zelda/i.test(r.title||'') && /40th Anniversary/i.test(r.title||'') && r.available === true && Number.isFinite(r.total) && r.total > 0 && r.total <= 130 && (!s.cartRequired || r.cartVerified === true);
}
