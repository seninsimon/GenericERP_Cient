import TextField from "./fields/TextField";
import NumberField from "./fields/NumberField";
import BooleanField from "./fields/BooleanField";
import DateField from "./fields/DateField";
import RelationField from "./fields/RelationField";
import FileField from "./fields/FileField";
import RichTextField from "./fields/RichTextBoxFiled";
import TextAreaField from "./fields/TextAreaField";

export default function FieldRenderer({ column, ...props }: any) {
  switch (column.type) {
    case "text":
      return <TextField column={column} {...props} />;

    case "number":
      return <NumberField column={column} {...props} />;

    case "boolean":
      return <BooleanField column={column} {...props} />;

    case "date":
      return <DateField column={column} {...props} />;

    case "relation":
      return <RelationField column={column} {...props} />;

    case "image":
    case "images":
    case "file":
    case "files":
      return <FileField column={column} {...props} />;

    case "richtext":
    case "richText": // older spelling
      return <RichTextField column={column} {...props} />;

    case "textarea":
      return <TextAreaField column={column} {...props} />;

    default:
      return null;
  }
}