/* eslint-disable @typescript-eslint/naming-convention */
import { stringify } from "querystring";
import internal = require("stream");
import { CancellationToken, commands, Event, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";

export class OpenPortProvider implements TreeDataProvider<TreeItem> {
  constructor() {
  }
  onDidChangeTreeData?: Event<void | TreeItem | TreeItem[] | null | undefined> | undefined;
  getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }
  async getChildren(element?: PortRoot | undefined): Promise<TreeItem[]> {
    if (element) {
      return element.getChildren();
    } else {
      return [new PortRoot(true), new PortRoot(false)];
    }

    return [];
  }
  getParent?(element: TreeItem): ProviderResult<TreeItem> {
    throw new Error("Method not implemented.");
  }
  resolveTreeItem?(item: TreeItem, element: TreeItem, token: CancellationToken): ProviderResult<TreeItem> {
    throw new Error("Method not implemented.");
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
class PortNode extends TreeItem {
  port: string;
  addr: string;
  short_name: string;
  desc: string;
  is_mine_only: boolean;
  constructor(_isMineOnly: boolean, _addr: string, _port: string,  _short_name: string, _desc: string) {
    super("" + _port);
    this.port = _port;
    this.addr = _addr;
    this.short_name = _short_name;
    this.desc = "" + _desc;
    this.is_mine_only=_isMineOnly;

    this.contextValue = this.short_name + ((null !== this.desc) ? " " + this.desc : "");
    this.id = "" + this.is_mine_only+":"+this.addr + ":" + _port;
    this.label = "" + this.port;
    this.description = this.contextValue + ", address=" + this.addr;
    this.collapsibleState = TreeItemCollapsibleState.None;
  }
}
class PortRoot extends TreeItem implements ChildBearer {
  is_mine_only: boolean;
  constructor(_isMineOnly: boolean) {
    super(_isMineOnly ? "Mine" : "All");
    this.is_mine_only = _isMineOnly;

    this.contextValue = _isMineOnly ? `My open ports` : `All open ports`;
    this.id = _isMineOnly ? "Mine" : "All";
    this.label = _isMineOnly ? "Mine" : "All";
    this.description = this.contextValue;
    this.collapsibleState = TreeItemCollapsibleState.Collapsed;
  }
  async getChildren(): Promise<TreeItem[]> {
    const result: CommandResult = await commands.executeCommand(`code-for-ibmi.runCommand`, {
      environment: `pase`,
      command: this.is_mine_only ? `/QOpenSys/pkgs/bin/scopenports --mine` : `/QOpenSys/pkgs/bin/scopenports`
    });

    let lines = result.stdout.split("\n");
    let regobj = new RegExp(String.raw`([^\s]+)\s+([0-9]+)\s+([^\s]+)\s+(\(.*\)){0,1}`);
    let ret = [];
    for (let i = 0; i < lines.length; ++i) {
      let line = lines[i];
      let components = regobj.exec(line);
      if (null === components) {
        continue;
      }
      ret.push(new PortNode(this.is_mine_only,components[1], components[2], components[3], components[4]));
    }
    return ret;
  }
}