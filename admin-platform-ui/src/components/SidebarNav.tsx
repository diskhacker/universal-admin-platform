import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import { NavLink } from "react-router-dom";
import { ReactNode } from "react";

export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

interface Props {
  items: NavItem[];
  sectionLabel?: string;
}

export default function SidebarNav({ items, sectionLabel }: Props) {
  return (
    <Box sx={{ px: 0, py: 1 }}>
      {sectionLabel && (
        <Typography
          variant="overline"
          sx={{
            px: 3,
            color: "text.secondary",
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          {sectionLabel}
        </Typography>
      )}
      <List>
        {items.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.path}
              end={item.path === "/" || item.path === "/super/tenants"}
              sx={{
                "&.active": {
                  bgcolor: "action.selected",
                  color: "primary.main",
                  "& .MuiListItemIcon-root": { color: "primary.main" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
