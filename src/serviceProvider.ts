/* eslint-disable @typescript-eslint/naming-convention */
import { getgroups } from "process";
import { stringify } from "querystring";
import internal = require("stream");
import { CancellationToken, commands, Event, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";

export class ServiceProvider implements TreeDataProvider<TreeItem> {
  constructor() {
  }
  onDidChangeTreeData?: Event<void | TreeItem | TreeItem[] | null | undefined> | undefined;
  getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }
  async getChildren(element?: GroupNode | undefined): Promise<TreeItem[]> {
    if (element) {
      return element.getChildren();
    } else {
      let groups = await this.getGroups();
      let ret: GroupNode[] = [];
      ret.push(new GroupNode("all"));
      for (let i = 0; i < groups.length; ++i) {
        ret.push(new GroupNode(groups[i]));
      }
      return ret;
    }
  }
  getParent?(element: TreeItem): ProviderResult<TreeItem> {
    throw new Error("Method not implemented.");
  }
  resolveTreeItem?(item: TreeItem, element: TreeItem, token: CancellationToken): ProviderResult<TreeItem> {
    throw new Error("Method not implemented.");
  }

  async getGroups(): Promise<string[]> {
    const result: CommandResult = await commands.executeCommand(`code-for-ibmi.runCommand`, {
      environment: `pase`,
      command: `/QOpenSys/pkgs/bin/sc -q --disable-colors groups`
    });
    return result.stdout.split("\n").map(val => val.trim());
  }
}

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}



interface ChildBearer {
  getChildren(): Promise<TreeItem[]>;
}
class ServiceNode extends TreeItem {
  short_name: string;
  friendly_name: string;
  status: string;
  constructor(_status: string, _shortName: string, _friendlyName: string, _group:string) {
    super(_shortName);
    this.short_name = _shortName;
    this.friendly_name = _friendlyName;
    this.status = _status;
    this.contextValue = this.short_name;
    this.id = _group+"."+this.short_name;
    this.label = this.short_name+" ("+this.status+")";
    this.description = this.friendly_name;
    this.collapsibleState = TreeItemCollapsibleState.None;
  }
}
class GroupNode extends TreeItem {
  name: string;
  constructor(_name: string) {
    super("" + _name);
    this.name = _name;

    this.contextValue = this.name;
    this.id = "" + this.name;
    this.label = this.id;
    this.description = this.name+" group";
    this.collapsibleState = TreeItemCollapsibleState.Collapsed;
  }

  async getChildren(): Promise<TreeItem[]> {
    const result: CommandResult = await commands.executeCommand(`code-for-ibmi.runCommand`, {
      environment: `pase`,
      command: `/QOpenSys/pkgs/bin/sc -q --disable-colors check group:` + this.name
    });

    let lines = result.stdout.split("\n");
    let regobj = new RegExp(String.raw`\s*(.*[^\s])\s*\|\s*([^\s]+)\s*\((.*)\)`);
    let ret = [];
    for (let i = 0; i < lines.length; ++i) {
      let line = lines[i];
      let components = regobj.exec(line);
      if (null === components) {
        continue;
      }
      ret.push(new ServiceNode(components[1], components[2], components[3], this.name));
    }
    return ret;
  }


}

