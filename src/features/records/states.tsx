import { Button } from "@mantine/core";
import { IconFileOff, IconLock } from "@tabler/icons-react";
import { Link } from "react-router-dom";

import { EmptyState } from "../../components/ui/EmptyState";
import { Page } from "../../components/ui/Page";

// Table missing or not visible to this user (the API answers 404 for both).
export function NoTableAccess({ table }: { table: string }) {
  return (
    <Page title="No access" breadcrumbs={[{ label: "Tables" }, { label: table }]}>
      <EmptyState
        icon={<IconLock size={26} stroke={1.5} />}
        title="You don't have access to this table"
        description="It may not exist, or your role and departments don't include it. Ask an administrator if you need it."
        action={
          <Button component={Link} to="/" variant="default">
            Go to home
          </Button>
        }
      />
    </Page>
  );
}

export function RecordNotFound({ table, listPath, title }: { table: string; listPath: string; title: string }) {
  return (
    <Page title="Record not found" breadcrumbs={[{ label: "Tables" }, { label: title, to: listPath }, { label: "Not found" }]}>
      <EmptyState
        icon={<IconFileOff size={26} stroke={1.5} />}
        title="Record not found"
        description={`It may have been deleted, or it belongs to a department you can't see in ${table}.`}
        action={
          <Button component={Link} to={listPath} variant="default">
            Back to {title}
          </Button>
        }
      />
    </Page>
  );
}
