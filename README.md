# EnHancer

[LANraragi](https://github.com/Difegue/LANraragi) is a nice app for managing comics and manga. Now it has the ability to download comic. That can make it an entry for comic world, both download and read can be in it.



However, this solution has several problems, including:

- Backup JSON is not quite readable for EH related plugins, so other operations like check-update and cross-application can be limited. 

- Metadata may lost if operated improperly, even if the comic zip file exists, it is hard to recover its original URL and meta info.

Using downloader like [E-Hentai-Downloader](https://github.com/dnsev-h/E-Hentai-Downloader) can have problem like:

- Change the hash of original zip file.



To solve it. I decided to write this project to solve these problems:

- Generate per-file eze style JSON from LANraragi Backup JSON or existing zip file.

- Check if gallery is updated from LANraragi Backup JSON.

TODO:

- [x] get external eze style JSON (by matching title or by matching source URL)
  - [x] from URL
  - [x] from LANraragi Backup JSON
  - ~[ ] from existing zip file~
    - ~[ ] by title~
    - ~[ ] by the source URL in zip file's info.json~
- [x] let LANraragi plugin to support external eze style JSON
  - [x] LANraragi #498
  - [x] LANraragi #584
  - [x] eze plugin enhancement (make it more like EH plugin)
- [ ] gallery update checker `visible == true`
  - [ ] from URL
  - [ ] from LANraragi Backup JSON

### Usage

Put `backup.json` in the folder, use `node parseBackup.js`. The output eze-style json file will be in `output/` folder, named by `filename` in backup.json.


> References:
>
> https://github.com/dnsev-h/ehentai-archive-info
>
> https://github.com/xiazeyu/hentaiTagger4calibre
>
> https://github.com/Difegue/LANraragi/issues/498
>
> https://github.com/Difegue/LANraragi/issues/584
