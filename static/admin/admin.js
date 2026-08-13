CMS.registerEditorComponent({
  id: 'admonition',
  label: '강조 박스 (Admonition)',
  fields: [
    {
      name: 'type',
      label: '종류',
      widget: 'select',
      options: [
        { label: 'Note', value: 'note' },
        { label: 'Tip', value: 'tip' },
        { label: 'Info', value: 'info' },
        { label: 'Caution', value: 'caution' },
        { label: 'Warning', value: 'warning' },
        { label: 'Danger', value: 'danger' },
      ],
      default: 'note',
    },
    {
      name: 'body',
      label: '내용',
      widget: 'text',
      hint: '짧은 문단만 넣어주세요. 불릿/번호 리스트를 넣으면 저장 시 인식이 깨질 수 있습니다.',
    },
  ],
  // Docusaurus admonition 구문(:::type ... :::)과 정확히 대응. 타입 목록은
  // 이 저장소 실사용 3종(note/info/caution) + Docusaurus 3 기본 타입(tip/warning/danger).
  pattern: /^:::(note|tip|info|caution|warning|danger)\n([\s\S]*?)\n:::$/,
  fromBlock: function (match) {
    return {
      type: match[1],
      body: match[2],
    };
  },
  toBlock: function (obj) {
    return `:::${obj.type}\n${obj.body}\n:::`;
  },
  toPreview: function (obj) {
    return (
      '<div style="border-left:4px solid #999;padding:8px 12px;margin:8px 0;background:#f6f6f6;">' +
      '<strong>' + obj.type.toUpperCase() + '</strong><br/>' + obj.body +
      '</div>'
    );
  },
});
