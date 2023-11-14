import {Err, None, Option} from 'dep'

export interface CustomError {
  readonly desc: string
  info: Option<any>
}

//////////////////////////////////////////
//////                              //////
//////        未知错误              //////
//////                             //////
/////////////////////////////////////////
export class UnknownError implements CustomError {
  readonly desc: string
  info: Option<any>
  constructor(desc = '未知错误', info: Option<any> = None) {
    this.info = info
    this.desc = desc
  }

  static new(desc = '未知错误', info: Option<any> = None) {
    return Err(new UnknownError(desc, info))
  }
}

/////////////////////////////////////////
//////                             //////
//////        schema验证错误       //////
//////                            //////
////////////////////////////////////////
export class SchemaParseError implements CustomError {
  readonly desc: string
  info: Option<any>
  constructor(desc = 'schema验证失败', info: Option<any> = None) {
    this.info = info
    this.desc = desc
  }
  static new(desc = 'schema验证失败', info: Option<any> = None) {
    return Err(new SchemaParseError(desc, info))
  }
}

////////////////////////////////////////
//////                            //////
//////        数据已经存在         //////
//////                            //////
////////////////////////////////////////
export class DataExistError implements CustomError {
  readonly desc: string
  info: Option<any>

  constructor(desc = '数据已经存在', info: Option<any> = None) {
    this.info = info
    this.desc = desc
  }
  static new(desc = '数据已经存在', info: Option<any> = None) {
    return Err(new SchemaParseError(desc, info ? info : None))
  }
}

////////////////////////////////////////
//////                            //////
//////        数据不存在           //////
//////                            //////
////////////////////////////////////////
export class NoDataError implements CustomError {
  desc: string
  info: Option<any>

  constructor(desc = '不存在数据', info: Option<any> = None) {
    this.info = info
    this.desc = desc
  }

  static new(desc = '不存在数据', info: Option<any> = None) {
    return Err(new NoDataError(desc, info))
  }
}

export class IOError implements CustomError {
  desc: string
  info: Option<any>

  constructor(desc = 'IO错误', info: Option<any> = None) {
    this.info = info
    this.desc = desc
  }

  static new(desc = 'IO错误', info: Option<any> = None) {
    return Err(new IOError(desc, info))
  }
}
