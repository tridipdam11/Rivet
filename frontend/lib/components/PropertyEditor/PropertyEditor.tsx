import React from "react";
import {
  AgentNodeData,
  ApprovalNodeData,
  ApproverType,
  CodeNodeData,
  DataMapperMode,
  DataMapperNodeData,
  DelayUnit,
  IfNodeData,
  IntegrationAuthStatus,
  IntegrationNodeData,
  IteratorNodeData,
  KnowledgeNodeData,
  KnowledgeSourceType,
  MemoryNodeData,
  MemoryScope,
  MemoryStrategy,
  MergeNodeData,
  MergeStrategy,
  NoOpNodeData,
  NodeType,
  OutputNodeData,
  OutputType,
  PromptNodeData,
  RetrievalMode,
  ScriptLanguage,
  StartNodeData,
  SwitchNodeData,
  ThirdPartyAppType,
  ToolNodeData,
  ToolType,
  TriggerNodeData,
  TriggerSource,
  WaitNodeData,
  WorkflowNode,
} from "../../types/workflow";

interface PropertyEditorProps {
  node: WorkflowNode;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNode["data"]>) => void;
}

const fieldClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
const labelClassName = "field-label text-[11px] font-bold uppercase tracking-normal text-slate-500";

export const PropertyEditor: React.FC<PropertyEditorProps> = ({ node, onUpdate }) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    onUpdate(node.id, { [name]: value });
  };

  const handleConfigChange = (field: string, value: unknown) => {
    onUpdate(node.id, { [field]: value });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <TextField
          label="Label"
          name="label"
          value={node.data.label || ""}
          onChange={handleChange}
        />
        <TextAreaField
          label="Description"
          name="description"
          value={node.data.description || ""}
          onChange={handleChange}
          rows={3}
        />
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-4">
        <div>
          <div className="text-[13px] font-bold text-slate-950">Configuration</div>
          <div className="mt-1 text-[12px] text-slate-500">
            {node.data.type.replace(/_/g, " ")}
          </div>
        </div>
        {renderSpecificEditor(node, handleConfigChange)}
      </section>
    </div>
  );
};

function renderSpecificEditor(
  node: WorkflowNode,
  onChange: (field: string, value: unknown) => void
) {
  const data = node.data;

  switch (data.type) {
    case NodeType.TRIGGER:
      return <TriggerEditor data={data as TriggerNodeData} onChange={onChange} />;
    case NodeType.START:
      return <StartEditor data={data as StartNodeData} onChange={onChange} />;
    case NodeType.IF:
      return <IfEditor data={data as IfNodeData} onChange={onChange} />;
    case NodeType.SWITCH:
      return <SwitchEditor data={data as SwitchNodeData} onChange={onChange} />;
    case NodeType.MERGE:
      return <MergeEditor data={data as MergeNodeData} onChange={onChange} />;
    case NodeType.WAIT:
      return <WaitEditor data={data as WaitNodeData} onChange={onChange} />;
    case NodeType.NOOP:
      return <NoOpEditor data={data as NoOpNodeData} onChange={onChange} />;
    case NodeType.ITERATOR:
      return <IteratorEditor data={data as IteratorNodeData} onChange={onChange} />;
    case NodeType.CODE:
      return <CodeEditor data={data as CodeNodeData} onChange={onChange} />;
    case NodeType.DATA_MAPPER:
      return <DataMapperEditor data={data as DataMapperNodeData} onChange={onChange} />;
    case NodeType.AGENT:
      return <AgentEditor data={data as AgentNodeData} onChange={onChange} />;
    case NodeType.PROMPT:
      return <PromptEditor data={data as PromptNodeData} onChange={onChange} />;
    case NodeType.KNOWLEDGE:
      return <KnowledgeEditor data={data as KnowledgeNodeData} onChange={onChange} />;
    case NodeType.INTEGRATION:
      return <IntegrationEditor data={data as IntegrationNodeData} onChange={onChange} />;
    case NodeType.TOOL:
      return <ToolEditor data={data as ToolNodeData} onChange={onChange} />;
    case NodeType.MEMORY:
      return <MemoryEditor data={data as MemoryNodeData} onChange={onChange} />;
    case NodeType.APPROVAL:
      return <ApprovalEditor data={data as ApprovalNodeData} onChange={onChange} />;
    case NodeType.OUTPUT:
      return <OutputEditor data={data as OutputNodeData} onChange={onChange} />;
    default:
      return null;
  }
}

const TextField: React.FC<{
  label: string;
  name?: string;
  value: string;
  placeholder?: string;
  type?: "text" | "number";
  step?: string;
  min?: string;
  max?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, ...props }) => (
  <label className="block space-y-2">
    <span className={labelClassName}>{label}</span>
    <input {...props} className={fieldClassName} />
  </label>
);

const TextAreaField: React.FC<{
  label: string;
  name?: string;
  value: string;
  placeholder?: string;
  rows?: number;
  monospace?: boolean;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}> = ({ label, monospace = false, ...props }) => (
  <label className="block space-y-2">
    <span className={labelClassName}>{label}</span>
    <textarea
      {...props}
      className={`${fieldClassName} resize-y leading-relaxed ${monospace ? "font-mono text-[12px]" : ""}`}
    />
  </label>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}> = ({ label, options, ...props }) => (
  <label className="block space-y-2">
    <span className={labelClassName}>{label}</span>
    <select {...props} className={fieldClassName}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  </label>
);

const parseNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const TriggerEditor: React.FC<{ data: TriggerNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField
      label="Source"
      value={data.triggerSource}
      options={Object.values(TriggerSource)}
      onChange={(e) => onChange("triggerSource", e.target.value)}
    />
    <TextField
      label="Event Name"
      value={data.eventName}
      onChange={(e) => onChange("eventName", e.target.value)}
      placeholder="new.customer.message"
    />
  </div>
);

const StartEditor: React.FC<{ data: StartNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <TextField
    label="Entry Label"
    value={data.entryLabel}
    onChange={(e) => onChange("entryLabel", e.target.value)}
    placeholder="manual_start"
  />
);

const IfEditor: React.FC<{ data: IfNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <TextField label="Condition" value={data.condition} onChange={(e) => onChange("condition", e.target.value)} />
    <div className="grid grid-cols-2 gap-3">
      <TextField label="True Label" value={data.trueLabel} onChange={(e) => onChange("trueLabel", e.target.value)} />
      <TextField label="False Label" value={data.falseLabel} onChange={(e) => onChange("falseLabel", e.target.value)} />
    </div>
  </div>
);

const SwitchEditor: React.FC<{ data: SwitchNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <TextField label="Expression" value={data.expression} onChange={(e) => onChange("expression", e.target.value)} />
    <TextField
      label="Cases"
      value={data.cases.join(", ")}
      onChange={(e) => onChange("cases", parseList(e.target.value))}
      placeholder="billing, support, sales"
    />
    <TextField label="Default Case" value={data.defaultCase} onChange={(e) => onChange("defaultCase", e.target.value)} />
  </div>
);

const MergeEditor: React.FC<{ data: MergeNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <SelectField
    label="Merge Strategy"
    value={data.mergeStrategy}
    options={Object.values(MergeStrategy)}
    onChange={(e) => onChange("mergeStrategy", e.target.value)}
  />
);

const WaitEditor: React.FC<{ data: WaitNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="grid grid-cols-2 gap-3">
    <TextField
      label="Delay"
      type="number"
      value={String(data.delayAmount)}
      onChange={(e) => onChange("delayAmount", parseNumber(e.target.value))}
    />
    <SelectField
      label="Unit"
      value={data.delayUnit}
      options={Object.values(DelayUnit)}
      onChange={(e) => onChange("delayUnit", e.target.value)}
    />
  </div>
);

const NoOpEditor: React.FC<{ data: NoOpNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <TextAreaField label="Note" value={data.note} onChange={(e) => onChange("note", e.target.value)} rows={4} />
);

const IteratorEditor: React.FC<{ data: IteratorNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <TextField label="List Path" value={data.listPath} onChange={(e) => onChange("listPath", e.target.value)} placeholder="upstream.search.documents" />
    <div className="grid grid-cols-2 gap-3">
      <TextField label="Item Key" value={data.itemKey} onChange={(e) => onChange("itemKey", e.target.value)} />
      <TextField label="Index Key" value={data.indexKey} onChange={(e) => onChange("indexKey", e.target.value)} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <TextField label="Output Key" value={data.outputKey} onChange={(e) => onChange("outputKey", e.target.value)} />
      <TextField label="Max Items" type="number" value={String(data.maxItems)} onChange={(e) => onChange("maxItems", parseNumber(e.target.value))} />
    </div>
  </div>
);

const CodeEditor: React.FC<{ data: CodeNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField
      label="Language"
      value={data.language}
      options={Object.values(ScriptLanguage)}
      onChange={(e) => onChange("language", e.target.value)}
    />
    <TextAreaField label="Code Snippet" value={data.code} onChange={(e) => onChange("code", e.target.value)} rows={8} monospace />
    <TextField label="Output Key" value={data.outputKey} onChange={(e) => onChange("outputKey", e.target.value)} />
  </div>
);

const DataMapperEditor: React.FC<{ data: DataMapperNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField
      label="Mode"
      value={data.mode}
      options={Object.values(DataMapperMode)}
      onChange={(e) => onChange("mode", e.target.value)}
    />
    <TextField label="Variable Key" value={data.variableKey ?? ""} onChange={(e) => onChange("variableKey", e.target.value)} placeholder="customerEmail" />
    <TextField label="Source Path" value={data.sourcePath ?? ""} onChange={(e) => onChange("sourcePath", e.target.value)} placeholder="sharedData.trigger.eventName" />
    <TextAreaField
      label="Mappings"
      value={data.mappings.map((mapping) => `${mapping.source}:${mapping.target}`).join(", ")}
      onChange={(e) =>
        onChange(
          "mappings",
          parseList(e.target.value)
            .map((item) => {
              const [source, target] = item.split(":").map((part) => part.trim());
              return { source, target };
            })
            .filter((mapping) => mapping.source && mapping.target)
        )
      }
      placeholder="sharedData.trigger.eventName:event.name"
      rows={4}
    />
  </div>
);

const AgentEditor: React.FC<{ data: AgentNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <TextField label="Role" value={data.role} onChange={(e) => onChange("role", e.target.value)} />
    <TextAreaField label="System Prompt" value={data.systemPrompt} onChange={(e) => onChange("systemPrompt", e.target.value)} rows={4} />
    <div className="grid grid-cols-2 gap-3">
      <TextField label="Model" value={data.model} onChange={(e) => onChange("model", e.target.value)} />
      <TextField
        label="Temperature"
        type="number"
        step="0.1"
        min="0"
        max="2"
        value={String(data.temperature)}
        onChange={(e) => onChange("temperature", parseNumber(e.target.value))}
      />
    </div>
    <TextField label="Max Steps" type="number" value={String(data.maxSteps)} onChange={(e) => onChange("maxSteps", parseNumber(e.target.value))} />
    <TextField
      label="Allowed Tools"
      value={data.allowedTools.join(", ")}
      onChange={(e) => onChange("allowedTools", parseList(e.target.value))}
      placeholder="crm_lookup, send_email"
    />
  </div>
);

const PromptEditor: React.FC<{ data: PromptNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <TextAreaField label="Prompt Template" value={data.promptTemplate} onChange={(e) => onChange("promptTemplate", e.target.value)} rows={6} monospace />
    <TextField
      label="Input Variables"
      value={data.inputVariables.join(", ")}
      onChange={(e) => onChange("inputVariables", parseList(e.target.value))}
      placeholder="customer_message, profile"
    />
    <TextField label="Output Key" value={data.outputKey} onChange={(e) => onChange("outputKey", e.target.value)} />
  </div>
);

const KnowledgeEditor: React.FC<{ data: KnowledgeNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField label="Source Type" value={data.sourceType} options={Object.values(KnowledgeSourceType)} onChange={(e) => onChange("sourceType", e.target.value)} />
    <TextField label="Source Name" value={data.sourceName} onChange={(e) => onChange("sourceName", e.target.value)} />
    <div className="grid grid-cols-2 gap-3">
      <SelectField label="Retrieval" value={data.retrievalMode} options={Object.values(RetrievalMode)} onChange={(e) => onChange("retrievalMode", e.target.value)} />
      <TextField label="Top K" type="number" value={String(data.topK)} onChange={(e) => onChange("topK", parseNumber(e.target.value))} />
    </div>
  </div>
);

const IntegrationEditor: React.FC<{ data: IntegrationNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField label="App Type" value={data.appType} options={Object.values(ThirdPartyAppType)} onChange={(e) => onChange("appType", e.target.value)} />
    <TextField label="Connected App" value={data.appName} onChange={(e) => onChange("appName", e.target.value)} placeholder="Slack" />
    <TextField label="Action" value={data.action} onChange={(e) => onChange("action", e.target.value)} placeholder="send_email_update" />
    <SelectField label="Auth Status" value={data.authStatus} options={Object.values(IntegrationAuthStatus)} onChange={(e) => onChange("authStatus", e.target.value)} />
    <TextField
      label="Mapped Fields"
      value={data.mappedFields.join(", ")}
      onChange={(e) => onChange("mappedFields", parseList(e.target.value))}
      placeholder="customer_email, refund_status"
    />
  </div>
);

const ToolEditor: React.FC<{ data: ToolNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField label="Tool Type" value={data.toolType} options={Object.values(ToolType)} onChange={(e) => onChange("toolType", e.target.value)} />
    <TextField label="Action" value={data.action} onChange={(e) => onChange("action", e.target.value)} />
    <TextField label="Endpoint" value={data.endpoint ?? ""} onChange={(e) => onChange("endpoint", e.target.value)} />
    <div className="grid grid-cols-2 gap-3">
      <TextField label="Timeout MS" type="number" value={String(data.timeoutMs ?? 0)} onChange={(e) => onChange("timeoutMs", parseNumber(e.target.value))} />
      <TextField label="Retries" type="number" value={String(data.retries)} onChange={(e) => onChange("retries", parseNumber(e.target.value))} />
    </div>
  </div>
);

const MemoryEditor: React.FC<{ data: MemoryNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField label="Scope" value={data.memoryScope} options={Object.values(MemoryScope)} onChange={(e) => onChange("memoryScope", e.target.value)} />
    <SelectField label="Strategy" value={data.strategy} options={Object.values(MemoryStrategy)} onChange={(e) => onChange("strategy", e.target.value)} />
    <TextField label="Max Items" type="number" value={String(data.maxItems)} onChange={(e) => onChange("maxItems", parseNumber(e.target.value))} />
  </div>
);

const ApprovalEditor: React.FC<{ data: ApprovalNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField label="Approver" value={data.approverType} options={Object.values(ApproverType)} onChange={(e) => onChange("approverType", e.target.value)} />
    <TextAreaField label="Instructions" value={data.instructions} onChange={(e) => onChange("instructions", e.target.value)} rows={4} />
    <TextField label="Timeout Minutes" type="number" value={String(data.timeoutMinutes)} onChange={(e) => onChange("timeoutMinutes", parseNumber(e.target.value))} />
  </div>
);

const OutputEditor: React.FC<{ data: OutputNodeData; onChange: (f: string, v: unknown) => void }> = ({
  data,
  onChange,
}) => (
  <div className="space-y-4">
    <SelectField label="Output Type" value={data.outputType} options={Object.values(OutputType)} onChange={(e) => onChange("outputType", e.target.value)} />
    <TextField label="Destination" value={data.destination} onChange={(e) => onChange("destination", e.target.value)} />
    <TextField label="Format" value={data.format} onChange={(e) => onChange("format", e.target.value)} />
  </div>
);
