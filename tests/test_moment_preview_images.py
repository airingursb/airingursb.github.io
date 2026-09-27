import importlib.util
from pathlib import Path
from unittest.mock import Mock

import pytest


spec = importlib.util.spec_from_file_location(
    "sync_moments", Path(__file__).parents[1] / "scripts/sync_moments.py"
)
assert spec is not None and spec.loader is not None
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

SOURCE = "https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2935109312.jpg"
PAGE = "https://movie.douban.com/subject/35811064/"
HOSTED = "https://images.example.com/moments/previews/cover.jpg"


def test_douban_metadata_stores_hosted_cover(monkeypatch: pytest.MonkeyPatch) -> None:
    response = Mock()
    response.read.return_value = (
        '{"title":"欢迎来龙餐馆","pic":{"normal":"' + SOURCE + '"}}'
    ).encode()
    monkeypatch.setattr(sync.urllib.request, "urlopen", Mock(return_value=response))
    monkeypatch.setattr(sync, "cos_enabled", lambda: True)
    download = Mock(return_value=(b"\xff\xd8\xffposter", "image/jpeg"))
    upload = Mock(return_value=HOSTED)
    monkeypatch.setattr(sync, "download_image", download)
    monkeypatch.setattr(sync, "upload_to_cos", upload)

    preview = sync.fetch_douban_metadata(PAGE)

    assert preview["image"] == HOSTED
    download.assert_called_once_with(SOURCE, referer="https://movie.douban.com/")
    assert upload.call_args.args[1].startswith("moments/previews/")


@pytest.mark.parametrize("download_result", [
    (None, None), (b"<html>denied</html>", "text/html"),
    (b"<html>denied</html>", "image/jpeg"),
])
def test_failed_cover_is_not_published_as_broken_external_image(
    monkeypatch: pytest.MonkeyPatch, download_result: tuple[bytes | None, str | None]
) -> None:
    monkeypatch.setattr(sync, "cos_enabled", lambda: True)
    monkeypatch.setattr(sync, "download_image", Mock(return_value=download_result))
    upload = Mock()
    monkeypatch.setattr(sync, "upload_to_cos", upload)
    assert sync.host_douban_cover(SOURCE) == ""
    upload.assert_not_called()


def test_missing_storage_does_not_publish_hotlink(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sync, "cos_enabled", lambda: False)
    assert sync.host_douban_cover(SOURCE) == ""


def test_sync_preserves_hosted_cover_after_download_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    messages = [{"telegram_post_id": "channel/1", "images": [],
                 "link_previews": [{"url": PAGE, "image": "", "title": "Movie"}]}]
    monkeypatch.setattr(sync, "fetch_url", lambda url: "")
    monkeypatch.setattr(sync, "parse_telegram_messages", lambda html: messages)
    monkeypatch.setattr(sync, "cos_enabled", lambda: False)
    monkeypatch.setattr(sync, "fetch_existing_images", Mock(return_value={
        "channel/1": [{"url": PAGE, "image": HOSTED}],
    }))
    save = Mock(return_value=True)
    monkeypatch.setattr(sync, "upsert_moments", save)
    sync.main()
    assert save.call_args.args[0][0]["link_previews"][0]["image"] == HOSTED
