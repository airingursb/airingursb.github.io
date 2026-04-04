import { Sandpack } from '@codesandbox/sandpack-react';

interface Props {
  code: string;
  lang?: 'typescript' | 'javascript';
  template?: 'react-ts' | 'react' | 'vanilla-ts' | 'vanilla';
}

export default function CodePlayground({
  code,
  lang = 'typescript',
  template = 'vanilla-ts',
}: Props) {
  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · Code Playground
        </span>
      </div>
      <div style={{ padding: 0 }}>
        <Sandpack
          template={template}
          files={{
            [`/index.${lang === 'typescript' ? 'ts' : 'js'}`]: code,
          }}
          theme="dark"
          options={{
            showConsole: true,
            showConsoleButton: true,
            editorHeight: 300,
          }}
        />
      </div>
    </div>
  );
}
