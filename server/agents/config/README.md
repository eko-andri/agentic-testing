# Agent Configuration Management

Proyek ini telah direfactor untuk memisahkan konfigurasi setiap agent ke dalam file terpisah untuk meningkatkan maintainability dan organisasi kode.

## Struktur Folder

```
server/agents/config/
├── index.js                    # Central import point
├── prompts.js                  # Main file with ConfigHelper class and DEFAULT_OPTIONS
├── framework-templates.js      # Framework templates (Playwright, Cypress, Selenium)
├── README.md                   # Documentation
└── agents/
    ├── form-structure-analyzer.js
    ├── intelligent-test-generator.js
    ├── test-quality-auditor.js
    └── test-code-generator.js
```

## Cara Penggunaan

### Import Semua Konfigurasi

```javascript
const {
  AGENTS_CONFIG,
  FRAMEWORK_TEMPLATES,
  DEFAULT_OPTIONS,
  ConfigHelper,
} = require("./server/agents/config/prompts");
```

### Import Agent Spesifik

```javascript
const FORM_STRUCTURE_ANALYZER = require("./server/agents/config/agents/form-structure-analyzer");
const TEST_QUALITY_AUDITOR = require("./server/agents/config/agents/test-quality-auditor");
```

### Menggunakan ConfigHelper

```javascript
// Mendapatkan agent berdasarkan nama
const agent = ConfigHelper.getAgent("FORM_STRUCTURE_ANALYZER");

// Membangun prompt untuk agent
const prompt = ConfigHelper.buildPrompt(
  "INTELLIGENT_TEST_GENERATOR",
  formStructure,
  description
);

// Mendapatkan template framework
const template = ConfigHelper.getFrameworkTemplate("playwright");

// Debug agent yang tersedia
ConfigHelper.debugAgentConfig();
```

## Manfaat Refactoring

### ✅ **Maintainability**

- Setiap agent memiliki file konfigurasi terpisah
- Mudah untuk memodifikasi konfigurasi satu agent tanpa mempengaruhi yang lain
- Kode lebih terorganisir dan mudah dibaca

### ✅ **Scalability**

- Mudah menambah agent baru dengan membuat file terpisah
- Struktur yang konsisten untuk semua agent
- Import/export yang bersih

### ✅ **Debugging**

- Lebih mudah melacak masalah pada agent tertentu
- Konfigurasi agent terisolasi satu sama lain
- Helper method untuk debugging tersedia

### ✅ **Collaboration**

- Developer bisa bekerja pada agent yang berbeda tanpa konflik
- Code review lebih fokus per agent
- Git history lebih bersih

## Menambah Agent Baru

1. **Buat file agent baru**:

```javascript
// agents/new-agent.js
const NEW_AGENT = {
  name: "NEW_AGENT",
  role: "agent role description",
  task: "agent task description",
  systemPrompt: `Your system prompt here...`,
  temperature: 0.1,
  category: "analysis|validation|generation",
  buildPrompt: function (param1, param2) {
    return `Your dynamic prompt here...`;
  },
};

module.exports = NEW_AGENT;
```

2. **Update index.js**:

```javascript
const NEW_AGENT = require("./agents/new-agent");

const AGENTS_CONFIG = [
  // ...existing agents...
  NEW_AGENT,
];

module.exports = {
  // ...existing exports...
  NEW_AGENT,
};
```

## Framework Template

Untuk menambah framework testing baru, edit `framework-templates.js`:

```javascript
const FRAMEWORK_TEMPLATES = {
  // ...existing frameworks...
  newFramework: {
    imports: `// Your framework imports`,
    helpers: `// Your helper functions`,
    testStructure: (testUrl) => `// Your test structure`,
  },
};
```

## Best Practices

1. **Naming Convention**: Gunakan kebab-case untuk nama file (contoh: `test-quality-auditor.js`)
2. **Agent Names**: Gunakan UPPER_SNAKE_CASE untuk nama agent (contoh: `TEST_QUALITY_AUDITOR`)
3. **Documentation**: Tambahkan komentar pada setiap agent untuk menjelaskan fungsinya
4. **Testing**: Test setiap agent secara terpisah setelah modifikasi
5. **Version Control**: Commit perubahan per agent untuk history yang bersih

## Migrasi dari Versi Lama

Jika Anda menggunakan versi lama yang masih menggunakan konfigurasi dalam satu file:

1. Import tetap sama dari `prompts.js`
2. Semua fungsi ConfigHelper masih tersedia
3. Tidak ada breaking changes untuk kode yang sudah ada
4. Struktur AGENTS_CONFIG tetap sama

## Troubleshooting

### Error: Cannot find module

- Pastikan path import benar
- Periksa apakah file agent sudah di-export dengan benar

### Error: Agent not found

- Gunakan `ConfigHelper.debugAgentConfig()` untuk melihat agent yang tersedia
- Periksa nama agent (case-sensitive)

### Error: buildPrompt function not found

- Pastikan agent memiliki method `buildPrompt`
- Periksa parameter yang dipassed ke `buildPrompt`

## Kontribusi

Ketika menambah atau memodifikasi agent:

1. Ikuti struktur dan convention yang ada
2. Update dokumentasi jika diperlukan
3. Test konfigurasi setelah perubahan
4. Commit dengan pesan yang descriptive
