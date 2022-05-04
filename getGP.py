ipb_member_id = "REPLACE ME"
ipb_pass_hash = "REPLACE ME"
igneous = "REPLACE ME"

fo = open("downlist.txt", "r")
download_text = fo.read()

download_list = download_text.split()
len(download_list)

import re
import pathlib
import json
gid_token_dict = dict()
download_id_list = []
for e in download_list:
    m = re.search('e(?:x|-)hentai\.org\/g\/([0-9]*)\/([0-z]*)\/*.*', e)
    id = m.group(1)
    token = m.group(2)
    gid_token_dict[id] = token
    download_id_list.append(id)

archiver_list = dict()
for f in list(pathlib.Path('.').glob('output/*.json')):
    jobj = json.loads(f.read_text())
    if (str(jobj["gallery_info_full"]["gallery"]["gid"]) in gid_token_dict):
        gid = str(jobj["gallery_info_full"]["gallery"]["gid"])
        token = str(jobj["gallery_info_full"]["gallery"]["token"])
        archiver_key = str(jobj["gallery_info_full"]["archiver_key"])
        archiver_list[gid] = f'https://exhentai.org/archiver.php?gid={gid}&token={token}&or={archiver_key}'
len(archiver_list)

import requests
import time
s = requests.Session()
s.cookies.set("ipb_member_id", ipb_member_id, domain="e-hentai.org")
s.cookies.set("ipb_pass_hash", ipb_pass_hash, domain="e-hentai.org")
s.cookies.set("igneous", igneous, domain="e-hentai.org")
s.cookies.set("ipb_member_id", ipb_member_id, domain="exhentai.org")
s.cookies.set("ipb_pass_hash", ipb_pass_hash, domain="exhentai.org")
s.cookies.set("igneous", igneous, domain="exhentai.org")
s.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'

import math
result = []
for index in range(len(download_id_list)):
    id = download_id_list[index]
    url = archiver_list[id]
    time.sleep(1)
    try:
        r = s.get(url)  
        m = re.search('Download Cost.*?<strong>(.*?)<\/strong>', r.text)
        cost = m.group(1)
        m = re.search('Estimated Size.*?<strong>(.*?)<\/strong>', r.text)
        size = m.group(1)
        if " GB" in size:
            size = size.replace(" GB", "")
            size = str(float(size) * 1024)
        if " MB" in size:
            size = size.replace(" MB", "")
        cost = cost.replace(" GP", "") \
                    .replace("1,", "1") \
                    .replace("1,", "1") \
                    .replace("2,", "2") \
                    .replace("3,", "3") \
                    .replace("4,", "4") \
                    .replace("5,", "5") \
                    .replace("6,", "6") \
                    .replace("7,", "7") \
                    .replace("8,", "8") \
                    .replace("9,", "9") \
                    .replace("0,", "0") \
                    .replace("Free!", "0")
        link = f"https://exhentai.org/g/{id}/{gid_token_dict[id]}"
        ratio = str(math.floor(float(cost) / (float(size) * 20)))
        m = re.search('gid=([0-9]*)', url)
        id = m.group(1)
        print(id, cost, size, ratio, f'{index+1}/{len(download_id_list)}')
        result.append((link, size, cost, ratio))
        fo = open("test.txt", "w")
        fo.write(json.dumps(result))
        fo.close()
    except Exception as e:
        print(f'failed {index+1}/{len(download_id_list)}', url, e)

fo = open("test.txt", "r")
output_text = fo.read()
output_text = output_text.replace("], [", "\n") \
            .replace("[[", "") \
            .replace("]]", "") \
            .replace("\"", "") \
            .replace(" ", "")
output_text = "URL,Size/MB,GPs,Ratio\n" + output_text
fo = open("test.csv", "w")
fo.write(output_text)
fo.close()