(function ($) {
    "use strict";

    var lastFocus = null;
    var $modal = $(".audit-modal");
    var $dim = $(".modal-dim");
    var uploadTimer = null;

    // 업로드 파일 확장자 확인
    // 허용 확장자: .xlsx, .xls
    function isExcelFile(fileName) {
        return /\.(xlsx|xls)$/i.test(fileName || "");
    }

    // 좌측 LNB 메뉴 클릭 시 페이지 패널 전환
    function setPage(pageName) {
        $(".page-panel").removeClass("is-active");
        $("[data-page-panel='" + pageName + "']").addClass("is-active");
        $(".lnb-link").removeClass("is-active");
        $(".lnb-link[data-page='" + pageName + "']").addClass("is-active");
        closeSelect();
        window.scrollTo(0, 0);
    }

    // 메인 파일 업로드 후 크롤링 진행중 상태 표시

    // 1. 기본 업로드 박스 숨김
    // 2. 진행중 상태 노출
    // 3. 1.2초 후 완료 상태 노출
    function showProgress(fileName) {
        var $progress = $("[data-state='progress']");
        var $done = $("[data-state='done']");

        $("[data-upload='main']").hide();
        $done.removeClass("is-show");
        $progress.addClass("is-show");
        $progress.find(".file-name").text(fileName);
        $done.find(".file-name").text(fileName);

        clearTimeout(uploadTimer);

        uploadTimer = setTimeout(function () {
            $progress.removeClass("is-show");
            $done.addClass("is-show");
        }, 1200);
    }

    // 메인 파일 업로드 영역 초기 상태로 되돌림
    // 크롤링 진행중 상태에서 취소 버튼 클릭 시 사용
    function resetMainUpload() {
        clearTimeout(uploadTimer);
        $("[data-state='progress'], [data-state='done']").removeClass("is-show");
        $("[data-upload='main']").show().find(".upload-msg").text("");
        $("[data-upload='main'] .upload-input").val("");
    }

    // 파일 업로드 input change 이벤트와 드래그앤드롭 업로드 공통 처리

    // uploadType 값:
    // - main  : 메인 파일 업로드 영역
    // - modal : 운영 진단 모달 내부 파일 업로드 영역
    function handleUpload($input) {
        var file = $input[0].files && $input[0].files[0];
        var fileName = file ? file.name : "";
        var $area = $input.closest("[data-upload]");
        var uploadType = $area.data("upload");

        $area.find(".upload-msg").text("");

        if (!file) {
            return;
        }

        // 엑셀 파일이 아니면 에러 메시지를 보여주고 input 값을 초기화
        if (!isExcelFile(fileName)) {
            $area.find(".upload-msg").text("엑셀 파일(xlsx, xls)만 업로드할 수 있습니다.");
            $input.val("");
            return;
        }

        // 메인 업로드 영역: 파일 업로드 후 크롤링 진행중 상태로 전환
        if (uploadType === "main") {
            showProgress(fileName);
            return;
        }

        // 모달 업로드 영역: 파일명 표시, 버튼 텍스트 변경, 확인 버튼 활성화 처리
        if (uploadType === "modal") {
            $area.addClass("is-uploaded");
            $area.find(".modal-file-name").text(fileName);
            $area.find(".upload-trigger").text("파일변경");
            $(".modal-confirm").prop("disabled", false);
        }
    }

    // 모달
    // 접근성 최소 대응:
    // - 모달 열기 전 포커스 저장
    // - 딤드 aria-hidden 변경
    // - body에 모달 오픈 상태 class 추가
    function openModal() {
        lastFocus = document.activeElement;
        $dim.show().attr("aria-hidden", "false");
        $modal.show().focus();
        $("body").addClass("is-modal-open");
    }

    // 모달이 닫힌 뒤 모달을 열었던 요소로 포커스
    function closeModal() {
        $modal.hide();
        $dim.hide().attr("aria-hidden", "true");
        $("body").removeClass("is-modal-open");

        if (lastFocus) {
            $(lastFocus).trigger("focus");
        }
    }

    // 모달 내부 파일 업로드 컴포넌트를 초기 상태로 되돌림
    // 모달을 새로 열 때마다 이전 업로드 상태가 남지 않도록 처리
    function resetModalUpload() {
        var $modalUpload = $("[data-upload='modal']");
        $modalUpload.removeClass("is-uploaded");
        $modalUpload.find(".modal-file-name").text("진단파일을 업로드 하세요");
        $modalUpload.find(".upload-trigger").text("파일선택");
        $modalUpload.find(".upload-input").val("");
        $modalUpload.find(".upload-msg").text("");
        $(".modal-confirm").prop("disabled", true);
    }

    // 열려 있는 모든 커스텀 select 닫기
    function closeSelect() {
        $("[data-select]").removeClass("is-open");
        $("[data-select] .select-btn").attr("aria-expanded", "false");
        $("[data-select] .select-list").stop(true, true).slideUp(140);
    }

    // 커스텀 select
    // 주요 기능:
    // - 다른 select가 열려 있으면 먼저 닫음
    // - 현재 select의 옵션 목록 높이를 화면 하단 여유 공간에 맞춰 계산
    // - 화면 높이를 넘어가면 옵션 영역 내부 스크롤 처리
    function openSelect($select) {
        var $list = $select.find(".select-list");

        // 현재 select 목록이 화면에서 시작되는 위치
        var listTop = $select.offset().top + $select.outerHeight() + 6 - $(window).scrollTop();

        // select 목록 아래쪽으로 사용할 수 있는 화면 여유 높이
        var spaceBottom = $(window).height() - listTop - 16;

        // 옵션 1개의 높이
        var itemHeight = 44;

        // 화면에 표시 가능한 옵션 개수를 계산
        var maxCount = Math.max(3, Math.floor(spaceBottom / itemHeight));
        var optionCount = $list.find("li").length;
        var visibleCount = Math.min(optionCount, maxCount);

        closeSelect();

        // border를 고려해 여유 높이 2px 추가
        $list.css("max-height", visibleCount * itemHeight + 2 + "px");
        $select.addClass("is-open");
        $select.find(".select-btn").attr("aria-expanded", "true");
        $list.stop(true, true).slideDown(160);
    }

    function toggleSelect($select) {
        if ($select.hasClass("is-open")) {
            closeSelect();
        } else {
            openSelect($select);
        }
    }

    // 모달 내부 포커스 트랩 처리
    function bindFocusTrap(e) {
        if (!$modal.is(":visible") || e.key !== "Tab") {
            return;
        }

        var focusable = $modal.find("a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])").filter(":visible");
        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (!first || !last) {
            return;
        }

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    // LNB 메뉴 클릭 이벤트
    // 클릭한 메뉴의 data-page 값에 맞는 화면으로 전환
    $(document).on("click", ".lnb-link", function (e) {
        var page = $(this).data("page");
        e.preventDefault();
        setPage(page);
    });

    // 파일선택 버튼 클릭 이벤트
    $(document).on("click", ".upload-trigger", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var input = $(this).closest(".upload-box").find(".upload-input")[0];

        if (!input) {
            return;
        }

        // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 input 값을 초기화
        input.value = "";
        input.click();
    });

    // 업로드 박스 클릭 / 키보드 접근 이벤트
    $(document).on("click keydown", ".upload-box", function (e) {
        if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") {
            return;
        }

        if ($(e.target).closest(".upload-trigger, .upload-input").length) {
            return;
        }

        e.preventDefault();

        var input = $(this).find(".upload-input")[0];

        if (!input) {
            return;
        }

        input.value = "";
        input.click();
    });

    // input[type=file] 값이 변경되었을 때 업로드 파일을 처리
    $(document).on("change", ".upload-input", function () {
        handleUpload($(this));
    });

    // 파일을 드래그해서 업로드 박스 위에 올렸을 때의 상태 처리
    $(document).on("dragenter dragover", ".upload-box", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass("is-drag");
    });

    // 드래그가 업로드 박스 밖으로 나가거나 drop 되었을 때 드래그 상태 class 제거
    $(document).on("dragleave drop", ".upload-box", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("is-drag");
    });

    // 파일 드롭 이벤트
    $(document).on("drop", ".upload-box", function (e) {
        var files = e.originalEvent.dataTransfer.files;
        var $input = $(this).find(".upload-input");

        if (!files || !files.length) {
            return;
        }

        $input[0].files = files;
        handleUpload($input);
    });

    // 크롤링 진행중 상태에서 취소 버튼 클릭 시 메인 업로드 영역을 초기화
    $(document).on("click", ".crawl-cancel", function () {
        resetMainUpload();
    });

    // 운영 진단하기 버튼 클릭 시 모달 열기
    // 열릴 때마다 업로드 상태 초기화
    $(document).on("click", ".open-modal", function () {
        resetModalUpload();
        openModal();
    });

    // 모달 닫기
    $(document).on("click", ".close-modal, .modal-dim", function () {
        closeModal();
    });

    // 모달 확인 버튼 클릭 시 모달을 닫고 리포트 화면으로 이동
    $(document).on("click", ".modal-confirm", function () {
        closeModal();
        setPage("report");
    });

    // 커스텀 select 버튼 클릭 이벤트
    $(document).on("click", ".select-btn", function (e) {
        e.stopPropagation();
        toggleSelect($(this).closest("[data-select]"));
    });

    // 커스텀 select 옵션 클릭 이벤트
    // 클릭한 옵션의 data-value 값을 버튼 영역에 표시하고, aria-selected 상태를 갱신한 뒤 select를 닫음
    $(document).on("click", ".select-list button", function (e) {
        var value = $(this).data("value");
        var $select = $(this).closest("[data-select]");

        e.stopPropagation();
        $select.find(".select-value").text(value);
        $select.find("[role='option']").attr("aria-selected", "false");
        $(this).attr("aria-selected", "true");
        closeSelect();
    });

    $(document).on("click", function () {
        closeSelect();
    });

    // 키보드 공통 이벤트
    // Escape:
    // - 열려 있는 select 닫기
    // - 모달이 열려 있으면 모달 닫기

    // Tab:
    // - 모달이 열려 있을 경우 bindFocusTrap에서 포커스 트랩 처리
    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            closeSelect();
            if ($modal.is(":visible")) {
                closeModal();
            }
        }
        bindFocusTrap(e);
    });

    // 화면 리사이즈 또는 스크롤 시 열려 있는 select의 옵션 목록 높이를 다시 계산
    $(window).on("resize scroll", function () {
        var $opened = $("[data-select].is-open");
        if ($opened.length) {
            openSelect($opened.eq(0));
        }
    });
})(jQuery);
